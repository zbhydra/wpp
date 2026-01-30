#!/bin/bash
set -e

###############################################################################
# 远程执行脚本 - 在目标服务器上执行部署更新
#
# 用法: (由 deploy.sh 自动调用，无需手动执行)
#   bash deploy_remote.sh <deploy_dir> <backup_dir> <keep_versions> [--no-backup] [--skip-health-check]
#
# 此脚本将:
# 1. 备份当前版本
# 2. 清理旧备份
# 3. 拉取最新代码
# 4. 安装/更新依赖
# 5. 运行数据库迁移
# 6. 重启服务
# 7. 健康检查
###############################################################################

DEPLOY_DIR="$1"
BACKUP_DIR="$2"
KEEP_VERSIONS="${3:-5}"
SKIP_BACKUP=""
SKIP_HEALTH_CHECK=""

# 检查可选参数
for arg in "$@"; do
    if [ "$arg" = "--no-backup" ]; then
        SKIP_BACKUP="--no-backup"
    fi
    if [ "$arg" = "--skip-health-check" ]; then
        SKIP_HEALTH_CHECK="--skip-health-check"
    fi
done

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_step() {
    echo -e "${BLUE}===>${NC} $*"
}

error_exit() {
    log_error "$1"
    exit 1
}

# 时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_${TIMESTAMP}"
CURRENT_VERSION_FILE="${DEPLOY_DIR}.current_version"

###############################################################################
# 1. 备份当前版本
###############################################################################
backup_current_version() {
    log_step "备份当前版本"

    if [ "$SKIP_BACKUP" = "--no-backup" ]; then
        log_warn "跳过备份"
        return
    fi

    # 创建备份目录
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

    # 备份源代码
    if [ -d "${DEPLOY_DIR}backend/src" ]; then
        cp -r "${DEPLOY_DIR}backend/src" "$BACKUP_DIR/$BACKUP_NAME/"
        log_info "已备份源代码"
    fi

    # 备份配置文件
    if [ -f "${DEPLOY_DIR}backend/config.yaml" ]; then
        cp "${DEPLOY_DIR}backend/config.yaml" "$BACKUP_DIR/$BACKUP_NAME/"
        log_info "已备份配置文件"
    fi

    # 备份 .venv (如果存在)
    if [ -d "${DEPLOY_DIR}backend/.venv" ]; then
        log_info "虚拟环境存在，跳过备份（将在更新后重建）"
    fi

    # 记录备份信息
    echo "$BACKUP_NAME" > "$CURRENT_VERSION_FILE"
    echo "$TIMESTAMP" > "$BACKUP_DIR/$BACKUP_NAME/timestamp.txt"

    # 获取当前 commit
    cd "$DEPLOY_DIR"
    if [ -d ".git" ]; then
        git rev-parse HEAD > "$BACKUP_DIR/$BACKUP_NAME/commit.txt" 2>/dev/null || true
    fi

    log_info "备份完成: $BACKUP_NAME"
}

###############################################################################
# 2. 清理旧备份
###############################################################################
cleanup_old_backups() {
    log_step "清理旧备份"

    if [ -d "$BACKUP_DIR" ]; then
        # 保留最近 N 个版本
        ls -t "$BACKUP_DIR" | tail -n +$((KEEP_VERSIONS + 1)) | while read old_backup; do
            log_info "删除旧备份: $old_backup"
            rm -rf "$BACKUP_DIR/$old_backup"
        done
    fi
}

###############################################################################
# 3. 拉取最新代码
###############################################################################
update_code() {
    log_step "拉取最新代码"

    cd "$DEPLOY_DIR"

    if [ ! -d ".git" ]; then
        error_exit "不是 Git 仓库，请先运行初始化脚本"
    fi

    log_info "更新代码..."
    git fetch origin
    git reset --hard origin/main

    COMMIT_SHA=$(git rev-parse --short HEAD)
    log_info "当前版本: $COMMIT_SHA"
}

###############################################################################
# 4. 安装/更新依赖
###############################################################################
install_dependencies() {
    log_step "安装依赖"

    cd "${DEPLOY_DIR}backend"

    # 确保 uv 可用
    if ! command -v uv &> /dev/null; then
        export PATH="$HOME/.cargo/bin:$PATH"
    fi

    # 删除旧的虚拟环境
    if [ -d ".venv" ]; then
        log_info "删除旧虚拟环境..."
        rm -rf .venv
    fi

    # 安装依赖
    log_info "创建虚拟环境并安装依赖..."
    uv sync

    log_info "依赖安装完成"
}

###############################################################################
# 5. 运行数据库迁移
###############################################################################
run_migrations() {
    log_step "运行数据库迁移"

    cd "${DEPLOY_DIR}backend"

    # 激活虚拟环境
    source .venv/bin/activate

    # 运行迁移脚本（使用 --yes 自动确认）
    if [ -f "src/app/init/sync_database_schema.py" ]; then
        python src/app/init/sync_database_schema.py --yes
        log_info "数据库迁移完成"
    else
        log_warn "未找到迁移脚本，跳过"
    fi
}

###############################################################################
# 6. 重启服务
###############################################################################
restart_service() {
    log_step "重启服务"

    # 使用 supervisor 重启
    if command -v supervisorctl &> /dev/null; then
        log_info "使用 supervisor 重启服务..."
        supervisorctl restart tg-download
        supervisorctl status tg-download
    else
        error_exit "未找到 supervisorctl，请手动配置 supervisor"
    fi
}

###############################################################################
# 7. 健康检查
###############################################################################
health_check() {
    log_step "执行健康检查"

    if [ "$SKIP_HEALTH_CHECK" = "--skip-health-check" ]; then
        log_warn "跳过健康检查"
        return
    fi

    # 等待服务启动（增加初始等待时间）
    sleep 15

    # 读取配置获取端口（只取第一个匹配，避免匹配到数据库/Redis端口）
    PORT=$(grep -oP 'port:\s*\K\d+' "${DEPLOY_DIR}backend/config.yaml" 2>/dev/null | head -n 1 || echo "9680")
    HOST="127.0.0.1"

    # 检查健康端点
    MAX_RETRIES=6
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -s "http://$HOST:$PORT/api/system/health" > /dev/null; then
            log_info "健康检查通过"
            return 0
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_info "等待服务启动... ($RETRY_COUNT/$MAX_RETRIES) http://$HOST:$PORT/api/system/health"
        sleep 5
    done

    error_exit "健康检查失败，请查看日志"
}

###############################################################################
# 主流程
###############################################################################
main() {
    log_info "=========================================="
    log_info "开始部署"
    log_info "=========================================="
    log_info "部署目录: $DEPLOY_DIR"
    log_info "备份目录: $BACKUP_DIR"
    log_info "保留版本: $KEEP_VERSIONS"
    if [ "$SKIP_BACKUP" = "--no-backup" ]; then
        log_warn "跳过备份"
    fi
    if [ "$SKIP_HEALTH_CHECK" = "--skip-health-check" ]; then
        log_warn "跳过健康检查"
    fi
    echo ""

    backup_current_version
    cleanup_old_backups
    update_code
    install_dependencies
    run_migrations
    restart_service
    health_check

    log_info "=========================================="
    log_info "部署完成！"
    log_info "=========================================="
    log_info "备份位置: $BACKUP_DIR/$BACKUP_NAME"
}

main
