#!/usr/bin/env python3
"""
数据库结构同步脚本
对比 models 中的模型定义与数据库实际结构，支持按需同步
"""

import asyncio
import importlib.util
import sys
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.sql.schema import quoted_name

import click
from sqlalchemy import inspect, text
from sqlalchemy.engine.reflection import Inspector

from app.core.database import Base, get_engine


@dataclass
class ColumnDiff:
    """列差异"""

    table_name: str
    column_name: str
    expected_type: str
    actual_type: str | None
    diff_type: str  # 'missing', 'type_mismatch', 'nullable_mismatch'


@dataclass
class IndexDiff:
    """索引差异"""

    table_name: str
    index_name: str
    diff_type: str  # 'missing', 'columns_mismatch'
    expected_columns: list[str] = field(default_factory=list)
    actual_columns: list[str] | None = None


@dataclass
class TableDiff:
    """表差异"""

    missing_tables: list[str] = field(default_factory=list)
    column_diffs: list[ColumnDiff] = field(default_factory=list)
    index_diffs: list[IndexDiff] = field(default_factory=list)


class SchemaComparator:
    """数据库结构比较器"""

    def __init__(self, engine) -> None:
        self.engine = engine
        self.inspector: Inspector | None = None

    async def compare(self) -> TableDiff:
        """比较模型定义与实际数据库结构"""
        result = TableDiff()

        # 获取所有注册到 Base.metadata 的表
        model_tables = self._get_model_tables()

        async with self.engine.begin() as conn:
            # 使用 run_sync 获取 inspector
            def _get_inspector_and_tables(sync_conn):
                insp = inspect(sync_conn)
                return insp, insp.get_table_names()

            self.inspector, db_tables = await conn.run_sync(_get_inspector_and_tables)

            # 检查缺失的表
            result.missing_tables = self._find_missing_tables(model_tables, db_tables)

            # 对比现有表的列和索引
            for table_name in model_tables:
                if table_name in db_tables:
                    await self._compare_columns(conn, table_name, result)
                    await self._compare_indexes(conn, table_name, result)

        return result

    def _get_model_tables(self) -> set[str]:
        """获取所有定义的模型表名"""
        return {table.name for table in Base.metadata.tables.values()}

    def _find_missing_tables(
        self, model_tables: set[str], db_tables: list[str]
    ) -> list[str]:
        """找出缺失的表"""
        missing = model_tables - set(db_tables)
        return sorted(missing)

    async def _compare_columns(self, conn, table_name: str, result: TableDiff):
        """比较列定义"""
        model_columns = self._get_model_columns(table_name)
        db_columns = await self._get_db_columns(conn, table_name)

        # 检查缺失的列
        for col_name, col_info in model_columns.items():
            if col_name not in db_columns:
                result.column_diffs.append(
                    ColumnDiff(
                        table_name=table_name,
                        column_name=col_name,
                        expected_type=col_info["type"],
                        actual_type=None,
                        diff_type="missing",
                    )
                )
            else:
                db_col = db_columns[col_name]
                # 类型比较（简化处理）
                model_type = self._normalize_type(col_info["type"])
                db_type = self._normalize_type(db_col["type"])

                if model_type != db_type:
                    result.column_diffs.append(
                        ColumnDiff(
                            table_name=table_name,
                            column_name=col_name,
                            expected_type=model_type,
                            actual_type=db_type,
                            diff_type="type_mismatch",
                        )
                    )

                # nullable 比较
                if col_info["nullable"] != db_col["nullable"]:
                    result.column_diffs.append(
                        ColumnDiff(
                            table_name=table_name,
                            column_name=col_name,
                            expected_type=col_info["type"],
                            actual_type=db_col["type"],
                            diff_type="nullable_mismatch",
                        )
                    )

    async def _compare_indexes(self, conn, table_name: str, result: TableDiff):
        """比较索引定义"""
        model_indexes = self._get_model_indexes(table_name)

        def _get_indexes(sync_conn):
            return {
                idx["name"]: idx for idx in inspect(sync_conn).get_indexes(table_name)
            }

        db_indexes = await conn.run_sync(_get_indexes)

        for idx_name, idx_info in model_indexes.items():
            if idx_name not in db_indexes:
                result.index_diffs.append(
                    IndexDiff(
                        table_name=table_name,
                        index_name=str(idx_name),
                        diff_type="missing",
                        expected_columns=idx_info["columns"],
                    )
                )

    def _get_model_columns(self, table_name: str) -> dict[str, Any]:
        """获取模型中的列定义"""
        table = Base.metadata.tables[table_name]
        columns = {}

        for col in table.columns:
            col_type = str(col.type.compile(self.engine.dialect))
            columns[col.name] = {
                "type": col_type,
                "nullable": col.nullable,
                "primary_key": col.primary_key,
            }

        return columns

    async def _get_db_columns(self, conn, table_name: str) -> dict[str, Any]:
        """获取数据库中的列定义"""
        result = await conn.execute(
            text(
                f"SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY "
                f"FROM INFORMATION_SCHEMA.COLUMNS "
                f"WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}'"
            )
        )
        columns = {}

        for row in result:
            columns[row[0]] = {
                "name": row[0],
                "type": row[1],
                "nullable": row[2] == "YES",
                "primary_key": row[3] == "PRI",
            }

        return columns

    def _get_model_indexes(
        self, table_name: str
    ) -> dict[str | quoted_name | None, dict[str, Any]]:
        """获取模型中的索引定义"""
        table = Base.metadata.tables[table_name]
        indexes: dict[str | quoted_name | None, dict[str, Any]] = {}

        for idx in table.indexes:
            indexes[idx.name] = {
                "name": idx.name,
                "columns": [col.name for col in idx.columns],
                "unique": idx.unique,
            }

        return indexes

    def _normalize_type(self, type_str: str) -> str:
        """规范化类型字符串用于比较"""
        type_str = type_str.upper()
        # 移除长度参数等细节
        for suffix in ["(255)", "(100)", "(64)", "(45)"]:
            type_str = type_str.replace(suffix, "")
        # 类型别名映射（MySQL 类型等价）
        type_mapping = {
            "TINYINT": "BOOL",  # MySQL 的 TINYINT(1) 用于表示 BOOL
            "BOOL": "BOOL",
            "INTEGER": "INT",  # INTEGER 和 INT 是等价的
            "INT": "INT",
        }
        return type_mapping.get(type_str, type_str)


class SchemaSync:
    """数据库结构同步器"""

    def __init__(self, engine):
        self.engine = engine

    async def sync(self, diff: TableDiff, dry_run: bool = False) -> list[str]:
        """执行同步操作"""
        executed = []

        if not dry_run:
            async with self.engine.begin() as conn:
                # 创建缺失的表
                for table_name in diff.missing_tables:
                    table = Base.metadata.tables[table_name]
                    await conn.run_sync(lambda c: table.create(c, checkfirst=True))
                    executed.append(f"创建表: {table_name}")

                # 处理列差异
                for col_diff in diff.column_diffs:
                    sql = await self._generate_column_sql(conn, col_diff)
                    if sql:
                        try:
                            await conn.execute(text(sql))
                            executed.append(f"✅ {sql}")
                        except Exception as e:
                            executed.append(f"❌ 执行失败: {sql} - {e}")

                # 处理索引差异
                for idx_diff in diff.index_diffs:
                    sqls = self._generate_index_sql(idx_diff)
                    for sql in sqls:
                        try:
                            await conn.execute(text(sql))
                            executed.append(f"✅ {sql}")
                        except Exception as e:
                            executed.append(f"❌ 执行失败: {sql} - {e}")

        return executed

    async def _generate_column_sql(self, conn, col_diff: ColumnDiff) -> str | None:
        """生成列修改 SQL"""
        if col_diff.diff_type == "missing":
            # 检查是否是主键列重命名（常见情况：id -> user_id）
            old_pk_col = await self._find_old_primary_key_column(
                conn, col_diff.table_name, col_diff.column_name
            )
            if old_pk_col:
                # 主键列重命名
                return (
                    f"ALTER TABLE {col_diff.table_name} "
                    f"CHANGE COLUMN {old_pk_col} {col_diff.column_name} "
                    f"{col_diff.expected_type} AUTO_INCREMENT"
                )

            # 普通列添加
            null_clause = "NULL" if col_diff.actual_type is None else "NOT NULL"
            return (
                f"ALTER TABLE {col_diff.table_name} "
                f"ADD COLUMN {col_diff.column_name} {col_diff.expected_type} {null_clause}"
            )

        elif col_diff.diff_type == "nullable_mismatch":
            # 修改 nullable 属性
            model_col = self._get_model_column(
                col_diff.table_name, col_diff.column_name
            )
            if model_col is None:
                return None
            null_clause = "NULL" if not model_col["nullable"] else "NOT NULL"
            return (
                f"ALTER TABLE {col_diff.table_name} "
                f"MODIFY COLUMN {col_diff.column_name} {col_diff.expected_type} {null_clause}"
            )

        return None

    async def _find_old_primary_key_column(
        self, conn, table_name: str, _new_column_name: str
    ) -> str | None:
        """查找需要重命名的旧主键列

        例如：模型定义了 user_id，但数据库中有 id 作为主键，则返回 'id'
        """
        # 获取模型中的主键列名
        model_pk = self._get_model_primary_key_column(table_name)
        if not model_pk:
            return None

        # 检查是否模型中的主键列在数据库中不存在
        result = await conn.execute(
            text(
                f"SELECT COUNT(*) FROM information_schema.COLUMNS "
                f"WHERE TABLE_SCHEMA = DATABASE() "
                f"AND TABLE_NAME = '{table_name}' "
                f"AND COLUMN_NAME = '{model_pk}'"
            )
        )
        model_pk_exists = result.scalar() > 0

        if model_pk_exists:
            return None  # 模型主键已存在，不是重命名情况

        # 获取数据库中的主键列名
        result = await conn.execute(
            text(
                f"SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE "
                f"WHERE TABLE_SCHEMA = DATABASE() "
                f"AND TABLE_NAME = '{table_name}' "
                f"AND CONSTRAINT_NAME = 'PRIMARY'"
            )
        )
        db_pk = result.scalar()

        # 如果数据库有主键但模型中没有对应的列，可能是重命名
        if db_pk and db_pk != model_pk:
            # 检查数据库主键列的类型是否与模型期望匹配
            db_col_type = await self._get_db_column_type(conn, table_name, db_pk)
            model_col_type = self._get_model_column_type(table_name, model_pk)

            # 类型兼容（都是 BIGINT）
            if self._is_compatible_type(db_col_type, model_col_type):
                return db_pk

        return None

    def _get_model_primary_key_column(self, table_name: str) -> str | None:
        """获取模型中的主键列名"""
        table = Base.metadata.tables.get(table_name)
        if table is None:
            return None

        for col in table.columns:
            if col.primary_key:
                return col.name
        return None

    async def _get_db_column_type(
        self, conn, table_name: str, column_name: str
    ) -> str | None:
        """获取数据库中列的类型"""
        result = await conn.execute(
            text(
                f"SELECT DATA_TYPE FROM information_schema.COLUMNS "
                f"WHERE TABLE_SCHEMA = DATABASE() "
                f"AND TABLE_NAME = '{table_name}' "
                f"AND COLUMN_NAME = '{column_name}'"
            )
        )
        return result.scalar()

    def _get_model_column_type(self, table_name: str, column_name: str) -> str | None:
        """获取模型中列的类型"""
        col_info = self._get_model_column(table_name, column_name)
        return col_info["type"] if col_info else None

    def _get_model_column(
        self, table_name: str, column_name: str
    ) -> dict[str, Any] | None:
        """获取模型中的列信息"""
        table = Base.metadata.tables.get(table_name)
        if table is None:
            return None

        for col in table.columns:
            if col.name == column_name:
                return {
                    "name": col.name,
                    "type": str(col.type.compile(self.engine.dialect)),
                    "nullable": col.nullable,
                    "primary_key": col.primary_key,
                }
        return None

    def _is_compatible_type(self, type1: str | None, type2: str | None) -> bool:
        """检查类型是否兼容"""
        if not type1 or not type2:
            return False
        # 规范化后比较
        return self._normalize_type(type1) == self._normalize_type(type2)

    def _normalize_type(self, type_str: str) -> str:
        """规范化类型字符串"""
        type_str = type_str.upper()
        for suffix in ["(255)", "(100)", "(64)", "(45)"]:
            type_str = type_str.replace(suffix, "")
        type_mapping = {
            "TINYINT": "BOOL",
            "BOOL": "BOOL",
            "INTEGER": "INT",
            "INT": "INT",
            "BIGINT": "BIGINT",
        }
        return type_mapping.get(type_str, type_str)

    def _generate_index_sql(self, idx_diff: IndexDiff) -> list[str]:
        """生成索引 SQL（可能包含多条语句：DROP + CREATE）"""
        sqls = []

        if idx_diff.diff_type == "missing":
            columns = ", ".join(idx_diff.expected_columns)
            # 先检查是否存在同名但结构不同的索引，需要删除
            drop_sql = (
                f"DROP INDEX IF EXISTS {idx_diff.index_name} ON {idx_diff.table_name}"
            )
            create_sql = f"CREATE INDEX {idx_diff.index_name} ON {idx_diff.table_name} ({columns})"
            sqls.append(drop_sql)
            sqls.append(create_sql)

        elif idx_diff.diff_type == "columns_mismatch":
            # 列不匹配，需要重建索引
            drop_sql = f"DROP INDEX {idx_diff.index_name} ON {idx_diff.table_name}"
            create_sql = f"CREATE INDEX {idx_diff.index_name} ON {idx_diff.table_name} ({', '.join(idx_diff.expected_columns)})"
            sqls.append(drop_sql)
            sqls.append(create_sql)

        return sqls


def print_diff(diff: TableDiff):
    """打印差异报告"""
    click.secho("\n" + "=" * 60, fg="cyan")
    click.secho("数据库结构差异报告", fg="cyan", bold=True)
    click.secho("=" * 60 + "\n", fg="cyan")

    # 缺失的表
    if diff.missing_tables:
        click.secho(f"❌ 缺失的表 ({len(diff.missing_tables)}):", fg="red")
        for table in diff.missing_tables:
            click.secho(f"   - {table}", fg="red")
        print()
    else:
        click.secho("✅ 所有表都已存在", fg="green")

    # 列差异
    if diff.column_diffs:
        click.secho(f"\n⚠️  列差异 ({len(diff.column_diffs)}):", fg="yellow")

        # 按类型分组
        missing = [d for d in diff.column_diffs if d.diff_type == "missing"]
        type_mismatch = [d for d in diff.column_diffs if d.diff_type == "type_mismatch"]
        nullable_mismatch = [
            d for d in diff.column_diffs if d.diff_type == "nullable_mismatch"
        ]

        if missing:
            click.secho(f"\n  缺失的列 ({len(missing)}):", fg="red")
            for d in missing:
                click.secho(
                    f"     {d.table_name}.{d.column_name} ({d.expected_type})", fg="red"
                )

        if type_mismatch:
            click.secho(f"\n  类型不匹配 ({len(type_mismatch)}):", fg="yellow")
            for d in type_mismatch:
                click.secho(
                    f"     {d.table_name}.{d.column_name}: 期望={d.expected_type}, 实际={d.actual_type}",
                    fg="yellow",
                )

        if nullable_mismatch:
            click.secho(f"\n  Nullable 不匹配 ({len(nullable_mismatch)}):", fg="yellow")
            for d in nullable_mismatch:
                click.secho(f"     {d.table_name}.{d.column_name}", fg="yellow")
    else:
        click.secho("\n✅ 列定义一致", fg="green")

    # 索引差异
    if diff.index_diffs:
        click.secho(f"\n📋 索引差异 ({len(diff.index_diffs)}):", fg="yellow")
        for idx_diff in diff.index_diffs:
            click.secho(
                f"   - {idx_diff.table_name}.{idx_diff.index_name}", fg="yellow"
            )
            if idx_diff.diff_type == "missing":
                click.secho(f"     缺失，列: {idx_diff.expected_columns}", fg="yellow")
    else:
        click.secho("\n✅ 索引定义一致", fg="green")

    print()


async def main(auto_yes: bool = False):
    """主函数

    Args:
        auto_yes: 自动确认，跳过交互式输入
    """
    click.secho("正在连接数据库...", fg="cyan")

    engine = get_engine()

    # 确保所有模型都被导入
    if importlib.util.find_spec("app.models"):
        import app.models  # noqa: F401
    else:
        click.secho("警告: 无法导入模型: app.models", fg="yellow")
        click.secho("继续使用已注册的模型...", fg="yellow")

    # 注册所有模型到 Base.metadata
    from app.models.base import BaseDBModel

    # 获取所有 BaseDBModel 的子类
    for cls in BaseDBModel.__subclasses__():
        if hasattr(cls, "__tablename__") and hasattr(cls, "__table__"):
            # 确保表被注册到 metadata
            Base.metadata._add_table(
                cls.__tablename__, cls.__tablename__, cls.__table__
            )

    click.secho(f"找到 {len(Base.metadata.tables)} 个定义的表", fg="green")

    # 比较结构
    comparator = SchemaComparator(engine)
    diff = await comparator.compare()

    # 打印差异
    print_diff(diff)

    # 如果没有差异
    if not any([diff.missing_tables, diff.column_diffs, diff.index_diffs]):
        click.secho("✨ 数据库结构完全一致，无需同步！", fg="green", bold=True)
        return

    # auto_yes 模式或交互式询问
    if auto_yes:
        choice = "Y"
    else:
        click.secho("是否执行同步？", fg="cyan", bold=True)
        click.secho("  [Y] 是    [N] 否    [Q] 退出", fg="white")
        choice = input("\n请选择: ").strip().upper()

    if choice == "Y" or choice == "y":
        sync = SchemaSync(engine)
        executed = await sync.sync(diff)

        if executed:
            click.secho("\n执行结果:", fg="green", bold=True)
            for line in executed:
                click.secho(f"  {line}", fg="green")
    elif choice == "Q" or choice == "q":
        click.secho("已取消", fg="yellow")
        sys.exit(0)
    else:
        click.secho("已取消", fg="yellow")


if __name__ == "__main__":
    # 检查命令行参数
    auto_yes = "--yes" in sys.argv or "-y" in sys.argv
    asyncio.run(main(auto_yes=auto_yes))
