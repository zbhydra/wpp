#!/bin/bash
set -e

###############################################################################
# 远程执行脚本 - 在目标服务器上执行初始化
#
# 用法: (由 init.sh 自动调用，无需手动执行)
#   bash deploy_init.sh <repo_url> [branch] [deploy_dir] [--force]
#
# 此脚本将:
# 1. 安装 uv
# 2. 克隆仓库
# 3. 安装 Python 依赖
# 4. 配置 supervisor
###############################################################################

REPO_URL="$1"
BRANCH="${2:-main}"
DEPLOY_DIR="${3:-/data/extension-tg-download/}"
FORCE=""

# 检查 --force 参数
for arg in "$@"; do
    if [ "$arg" = "--force" ]; then
        FORCE="--force"
        break
    fi
done

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

error_exit() {
    log_error "$1"
    exit 1
}



###############################################################################
# 安装 uv
###############################################################################
install_uv() {
    log_info "=== 安装 uv ==="

    if command -v uv &> /dev/null; then
        log_info "uv 已安装: $(uv --version)"
        return
    fi

    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"

    if command -v uv &> /dev/null; then
        log_info "uv 安装成功: $(uv --version)"
    else
        error_exit "uv 安装失败"
    fi
}

###############################################################################
# 创建部署目录
###############################################################################
create_deploy_dir() {
    log_info "=== 创建部署目录 ==="

    # 强制模式：删除已存在的部署目录
    if [ "$FORCE" = "--force" ] && [ -d "$DEPLOY_DIR" ]; then
        log_warn "强制模式：删除已存在的部署目录: $DEPLOY_DIR"
        # 停止服务（如果正在运行）
        if command -v supervisorctl &> /dev/null; then
            supervisorctl stop tg-download 2>/dev/null || true
        fi
        # 删除部署目录
        rm -rf "$DEPLOY_DIR"
        log_info "已删除部署目录"
    fi

    mkdir -p "$DEPLOY_DIR"
    mkdir -p "/backup/extension-tg-download/"

    log_info "部署目录: $DEPLOY_DIR"
}

###############################################################################
# 创建日志目录
###############################################################################
create_log_dir() {
    log_info "=== 创建日志目录 ==="

    mkdir -p "$DEPLOY_DIR/backend/log"

    log_info "日志目录: $DEPLOY_DIR/backend/log"
}

###############################################################################
# 克隆仓库
###############################################################################
clone_repository() {
    log_info "=== 克隆仓库 ==="

    if [ -z "$REPO_URL" ]; then
        error_exit "请提供仓库 URL: ./init.sh <repo_url> [branch]"
    fi

    # 强制模式：完全删除目录后重新克隆
    if [ "$FORCE" = "--force" ]; then
        log_info "强制模式：重新克隆仓库..."
        rm -rf "$DEPLOY_DIR"
        mkdir -p "$DEPLOY_DIR"
    fi

    if [ -d "$DEPLOY_DIR/.git" ]; then
        log_info "仓库已存在，拉取最新代码..."
        cd "$DEPLOY_DIR"
        git fetch origin
        git reset --hard "origin/$BRANCH"
    else
        log_info "克隆仓库..."
        git clone -b "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
    fi

    COMMIT_SHA=$(git rev-parse --short HEAD)
    log_info "当前版本: $COMMIT_SHA"
}

###############################################################################
# 安装 Python 依赖
###############################################################################
install_python_dependencies() {
    log_info "=== 安装 Python ==="

    cd "$DEPLOY_DIR/backend"

    if ! command -v uv &> /dev/null; then
        export PATH="$HOME/.cargo/bin:$PATH"
    fi

    # 读取 pyproject.toml 中的 Python 版本要求
    PYTHON_VERSION=$(grep -oP 'requires-python = ">=\K[0-9.]+' pyproject.toml 2>/dev/null || echo "3.11")
    log_info "项目要求 Python >= $PYTHON_VERSION"
    log_info "使用 uv 安装 Python..."

    # 使用 uv 安装 Python
    uv python install "$PYTHON_VERSION" || log_warn "Python 安装失败，将使用系统默认版本"

    # 获取 uv 安装的 Python 路径
    PYTHON_PATH=$(uv python find "$PYTHON_VERSION" 2>/dev/null || echo "")
    if [ -n "$PYTHON_PATH" ]; then
        log_info "Python 安装成功: $PYTHON_PATH"
    fi

    log_info "=== 安装项目依赖 ==="
    uv sync

    log_info "依赖安装完成"
}

###############################################################################
# 配置文件检查
###############################################################################
check_config() {
    log_info "=== 检查配置文件 ==="

    cd "$DEPLOY_DIR/backend"

    if [ ! -f "config.yaml" ]; then
        if [ -f "config.yaml.example" ]; then
            log_warn "未找到 config.yaml，从 example 复制..."
            cp config.yaml.example config.yaml
            log_warn "请编辑 config.yaml 配置数据库等信息！"
            log_warn "编辑后运行: bash deploy/deploy.sh"
            exit 0
        else
            error_exit "未找到 config.yaml 或 config.yaml.example"
        fi
    fi

    log_info "配置文件存在"
}

###############################################################################
# 配置 supervisor
###############################################################################
configure_supervisor() {
    log_info "=== 配置 supervisor ==="

    SUPERVISOR_CONF_DIR="/etc/supervisor/config.d"
    SUPERVISOR_CONF="$SUPERVISOR_CONF_DIR/tg-download.conf"

    # 创建 supervisor 配置目录
    mkdir -p "$SUPERVISOR_CONF_DIR"

    # 复制配置文件
    cp "$DEPLOY_DIR/backend/deploy/supervisor/tg-download.conf" "$SUPERVISOR_CONF"

    # 更新配置文件中的部署目录路径
    sed -i "s|/data/extension-tg-download/|$DEPLOY_DIR|g" "$SUPERVISOR_CONF"

    # 重新加载 supervisor
    supervisorctl reread
    supervisorctl update

    log_info "supervisor 配置完成"
    log_info "配置文件: $SUPERVISOR_CONF"
}

###############################################################################
# 设置权限
###############################################################################
set_permissions() {
    log_info "=== 设置权限 ==="

    chmod +x "$DEPLOY_DIR/backend/deploy"/*.sh
    chmod -R 755 "$DEPLOY_DIR/backend/deploy"

    log_info "权限设置完成"
}

###############################################################################
# 显示后续步骤
###############################################################################
show_next_steps() {
    log_info "=========================================="
    log_info "初始化完成！"
    log_info "=========================================="
    echo ""
    log_info "后续步骤:"
    echo "  1. 编辑配置文件: vi $DEPLOY_DIR/backend/config.yaml"
    echo "  2. 运行数据库迁移: cd $DEPLOY_DIR/backend && uv run python src/app/init/sync_database_schema.py"
    echo "  3. 启动服务: supervisorctl start tg-download"
    echo "  4. 查看状态: supervisorctl status tg-download"
    echo "  5. 查看日志: tail -f $DEPLOY_DIR/backend/log/supervisor.log"
    echo ""
    log_info "GitHub Actions Secrets 配置:"
    echo "  - SERVER_HOST: 服务器 IP 或域名"
    echo "  - SERVER_USER: 登录用户 (通常是 root)"
    echo "  - SSH_PRIVATE_KEY: SSH 私钥"
    echo "  - SSH_PORT: SSH 端口 (默认 22)"
    echo "  - REPO_URL: 仓库 URL"
    echo "  - DEPLOY_DIR: $DEPLOY_DIR"
    echo "  - BACKUP_DIR: /backup/extension-tg-download/"
    echo "  - HEALTH_CHECK_URL: http://your-server:9680/api/system/health"
    echo ""
}

###############################################################################
# 主流程
###############################################################################
main() {
    log_info "=========================================="
    log_info "开始初始化部署环境"
    log_info "=========================================="
    log_info "仓库: $REPO_URL"
    log_info "分支: $BRANCH"
    log_info "部署目录: $DEPLOY_DIR"
    if [ "$FORCE" = "--force" ]; then
        log_warn "强制模式: --force"
    fi
    echo ""

    install_uv
    create_deploy_dir
    clone_repository
    create_log_dir
    install_python_dependencies
    check_config
    configure_supervisor
    set_permissions

    show_next_steps
}

main
