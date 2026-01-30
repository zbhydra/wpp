#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用SQL执行工具
列出所有待执行的SQL，按确认后执行
"""

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List

import yaml


@dataclass
class SQLStatement:
    """SQL语句"""

    id: str
    description: str
    sql: str
    executed: bool = False


class SQLExecutor:
    """SQL执行器"""

    def __init__(self, config_path: str = "../../../config.yaml"):
        """初始化执行器"""
        self.config = self._load_config(config_path)
        self.engine = None
        self.connection = None
        self.sql_file = Path(__file__).parent / "pending_sqls.yaml"

    def _load_config(self, config_path: str) -> dict:
        """加载配置文件"""
        config_file = Path(config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"配置文件不存在: {config_path}")

        with open(config_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)

    def _connect_database(self):
        """连接数据库"""
        db_config = self.config["database"]
        connection_string = (
            f"mysql+pymysql://{db_config['user']}:{db_config['password']}"
            f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
            f"?charset=utf8mb4"
        )

        try:
            from sqlalchemy import create_engine

            self.engine = create_engine(connection_string)
            self.connection = self.engine.connect()
            print(f"✓ 成功连接到数据库: {db_config['database']}")
            return True
        except Exception as e:
            print(f"✗ 数据库连接失败: {e}")
            return False

    def _load_sqls(self) -> List[SQLStatement]:
        """从YAML文件加载SQL语句"""
        if not self.sql_file.exists():
            print(f"📝 SQL文件不存在，创建新文件: {self.sql_file}")
            self._create_default_sqls()
            return self._load_sqls()

        try:
            with open(self.sql_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}

            sqls = []
            for sql_data in data.get("sqls", []):
                sqls.append(
                    SQLStatement(
                        id=sql_data["id"],
                        description=sql_data["description"],
                        sql=sql_data["sql"],
                        executed=sql_data.get("executed", False),
                    )
                )

            return sqls
        except Exception as e:
            print(f"✗ 加载SQL文件失败: {e}")
            return []

    def _save_sqls(self, sqls: List[SQLStatement]):
        """保存SQL语句到YAML文件"""
        data = {
            "sqls": [
                {
                    "id": sql.id,
                    "description": sql.description,
                    "sql": sql.sql,
                    "executed": sql.executed,
                }
                for sql in sqls
            ]
        }

        try:
            with open(self.sql_file, "w", encoding="utf-8") as f:
                yaml.dump(
                    data, f, default_flow_style=False, allow_unicode=True, indent=2
                )
        except Exception as e:
            print(f"✗ 保存SQL文件失败: {e}")

    def _create_default_sqls(self):
        """创建默认的SQL语句"""
        default_sqls = [
            {
                "id": "fix_tasks_primary_key",
                "description": "修复tasks表主键 - 删除重复的id=0记录",
                "sql": """DELETE FROM tasks WHERE id = 0 LIMIT 1;""",
                "executed": False,
            },
            {
                "id": "set_tasks_primary_key",
                "description": "设置tasks表id为主键",
                "sql": """ALTER TABLE tasks ADD PRIMARY KEY (id);""",
                "executed": False,
            },
            {
                "id": "fix_runners_id_field",
                "description": "修复runners表 - 删除多余的自增id字段，使用runner_id作为主键",
                "sql": """ALTER TABLE runners DROP COLUMN id;""",
                "executed": False,
            },
            {
                "id": "set_runners_primary_key",
                "description": "设置runners表的runner_id为主键",
                "sql": """ALTER TABLE runners ADD PRIMARY KEY (runner_id);""",
                "executed": False,
            },
            {
                "id": "set_task_results_primary_key",
                "description": "设置task_results表的result_id为主键",
                "sql": """ALTER TABLE task_results ADD PRIMARY KEY (result_id);""",
                "executed": False,
            },
        ]

        data = {"sqls": default_sqls}

        with open(self.sql_file, "w", encoding="utf-8") as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, indent=2)

    def _execute_sql(self, sql: str) -> bool:
        """执行SQL语句"""
        try:
            from sqlalchemy import text

            if self.connection is None:
                raise ValueError("数据库连接未建立")
            self.connection.execute(text(sql))
            print("✅ 执行成功")
            return True
        except Exception as e:
            print(f"✗ 执行失败: {e}")
            return False

    def list_sqls(self, sqls: List[SQLStatement]):
        """列出所有SQL语句"""
        print("\n📋 待执行的SQL语句:")
        print("=" * 80)

        if not sqls:
            print("📭 没有待执行的SQL语句")
            return

        for i, sql in enumerate(sqls, 1):
            status = "✅ 已执行" if sql.executed else "⏳ 待执行"
            print(f"\n{i:2d}. [{status}] {sql.description}")
            print(f"    ID: {sql.id}")
            print(f"    SQL: {sql.sql}")

        print("\n" + "=" * 80)

    def run(self, execute_all: bool = False):
        """运行SQL执行器"""
        print("🚀 SQL执行工具")
        print("=" * 60)

        # 连接数据库
        if not self._connect_database():
            return False

        # 加载SQL语句
        sqls = self._load_sqls()

        if not sqls:
            print("📭 没有待执行的SQL语句")
            return True

        # 列出所有SQL
        self.list_sqls(sqls)

        # 选择要执行的SQL
        pending_sqls = [sql for sql in sqls if not sql.executed]

        if not pending_sqls:
            print("✅ 所有SQL都已执行完毕")
            return True

        print(f"\n⏳ 待执行的SQL数量: {len(pending_sqls)}")

        if execute_all:
            selected_sqls = pending_sqls
        else:
            print("\n选择执行方式:")
            print("1. 执行所有待执行的SQL")
            print("2. 选择特定SQL执行")
            print("3. 退出")

            choice = input("\n请选择 (1-3): ").strip()

            if choice == "1":
                selected_sqls = pending_sqls
            elif choice == "2":
                print("\n待执行的SQL列表:")
                for i, sql in enumerate(pending_sqls, 1):
                    print(f"{i}. {sql.description} ({sql.id})")

                try:
                    indices = input(
                        "输入要执行的SQL编号（用逗号分隔，如: 1,3,5）: "
                    ).strip()
                    if indices:
                        selected_indices = [
                            int(x.strip()) - 1 for x in indices.split(",")
                        ]
                        selected_sqls = [
                            pending_sqls[i]
                            for i in selected_indices
                            if 0 <= i < len(pending_sqls)
                        ]
                    else:
                        print("❌ 未选择任何SQL")
                        return False
                except ValueError:
                    print("❌ 输入格式错误")
                    return False
            else:
                print("❌ 退出")
                return False

        # 确认执行
        print(f"\n⚠️  即将执行 {len(selected_sqls)} 个SQL语句:")
        for sql in selected_sqls:
            print(f"   - {sql.description}")

        confirm = input("\n确认执行？(y/N): ").strip().lower()
        if confirm != "y":
            print("❌ 取消执行")
            return False

        # 执行SQL
        success_count = 0
        try:
            if self.connection is None:
                raise ValueError("数据库连接未建立")
            with self.connection.begin():
                for sql in selected_sqls:
                    print(f"\n🔧 执行: {sql.description}")
                    if self._execute_sql(sql.sql):
                        sql.executed = True
                        success_count += 1

                print(f"\n✅ 执行完成: {success_count}/{len(selected_sqls)} 成功")

        except Exception as e:
            print(f"❌ 执行过程中出错: {e}")
            print("   事务已回滚")
            return False

        finally:
            if self.connection is not None:
                self.connection.close()

        # 保存执行状态
        if success_count > 0:
            self._save_sqls(sqls)

        return success_count == len(selected_sqls)

    def add_sql(self, description: str, sql: str):
        """添加新的SQL语句"""
        sqls = self._load_sqls()

        # 生成唯一ID
        import time

        sql_id = f"custom_{int(time.time())}"

        new_sql = SQLStatement(
            id=sql_id, description=description, sql=sql, executed=False
        )

        sqls.append(new_sql)
        self._save_sqls(sqls)

        print(f"✅ 已添加新SQL: {description} (ID: {sql_id})")


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="SQL执行工具")
    parser.add_argument("--config", default="../../../config.yaml", help="配置文件路径")
    parser.add_argument(
        "--execute-all", action="store_true", help="执行所有待执行的SQL"
    )
    parser.add_argument(
        "--add", nargs=2, metavar=("DESCRIPTION", "SQL"), help="添加新的SQL语句"
    )

    args = parser.parse_args()

    try:
        executor = SQLExecutor(args.config)

        if args.add:
            description, sql = args.add
            executor.add_sql(description, sql)
        else:
            success = executor.run(execute_all=args.execute_all)
            sys.exit(0 if success else 1)

    except Exception as e:
        print(f"❌ 执行失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
