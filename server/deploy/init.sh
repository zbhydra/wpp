#!/bin/bash
set -e

###############################################################################
# 本地部署脚本 - 通过 SSH 远程执行部署
#
# 用法:
#   ./backend/deploy/init.sh [--force]
#
# 说明:
#   此脚本通过 SSH 连接到远程服务器，传输并执行 deploy_init.sh
###############################################################################

#===============================================================================
# 配置区域 - 修改这里的值
#===============================================================================

# 服务器连接信息
SERVER_HOST="8.134.199.211"          # 服务器 IP 或域名
SERVER_PORT="22"                      # SSH 端口
SERVER_USER="root"                    # SSH 用户

# 仓库信息
REPO_URL="git@github.com-extension-tg-download:zbhydra/extension-tg-download.git"  # Git 仓库 URL
BRANCH="main"                          # Git 分支

# 部署配置
DEPLOY_DIR="/data/extension-tg-download/"  # 部署目录

# SSH 认证（可选，默认使用 backend/deploy/key/id_ed25519）
# SSH_PRIVATE_KEY_PATH=""              # 自定义 SSH 私钥路径
# SSH_PASSWORD=""                      # SSH 密码（不推荐，优先使用私钥）

#===============================================================================
# 以下内容无需修改
#===============================================================================

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

# 检查 --force 参数
FORCE=""
for arg in "$@"; do
    if [ "$arg" = "--force" ]; then
        FORCE="--force"
        break
    fi
done

###############################################################################
# SSH 认证
###############################################################################
build_ssh_command() {
    local ssh_opts="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -o LogLevel=ERROR"

    # 优先使用环境变量指定的私钥
    if [ -n "$SSH_PRIVATE_KEY_PATH" ] && [ -f "$SSH_PRIVATE_KEY_PATH" ]; then
        echo "ssh -i \"$SSH_PRIVATE_KEY_PATH\" -p $SERVER_PORT $ssh_opts ${SERVER_USER}@${SERVER_HOST}"
    # 其次使用项目默认私钥
    elif [ -f "backend/deploy/key/id_ed25519" ]; then
        echo "ssh -i backend/deploy/key/id_ed25519 -p $SERVER_PORT $ssh_opts ${SERVER_USER}@${SERVER_HOST}"
    elif [ -f "backend/deploy/key/id_rsa" ]; then
        echo "ssh -i backend/deploy/key/id_rsa -p $SERVER_PORT $ssh_opts ${SERVER_USER}@${SERVER_HOST}"
    # 最后使用用户默认私钥
    elif [ -f "$HOME/.ssh/id_ed25519" ]; then
        echo "ssh -i \"$HOME/.ssh/id_ed25519\" -p $SERVER_PORT $ssh_opts ${SERVER_USER}@${SERVER_HOST}"
    elif [ -f "$HOME/.ssh/id_rsa" ]; then
        echo "ssh -i \"$HOME/.ssh/id_rsa\" -p $SERVER_PORT $ssh_opts ${SERVER_USER}@${SERVER_HOST}"
    # 最后使用密码（使用环境变量，避免在进程列表暴露）
    elif [ -n "$SSH_PASSWORD" ]; then
        if ! command -v sshpass &> /dev/null; then
            error_exit "使用密码认证需要安装 sshpass: brew install sshpass"
        fi
        echo "sshpass -e ssh -p $SERVER_PORT $ssh_opts ${SERVER_USER}@${SERVER_HOST}"
    else
        error_exit "未找到 SSH 认证方式：请设置 SSH_PRIVATE_KEY_PATH 或 SSH_PASSWORD 环境变量，或在 backend/deploy/key/ 放置私钥"
    fi
}

build_scp_command() {
    local ssh_opts="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -o LogLevel=ERROR"

    if [ -n "$SSH_PRIVATE_KEY_PATH" ] && [ -f "$SSH_PRIVATE_KEY_PATH" ]; then
        echo "scp -i \"$SSH_PRIVATE_KEY_PATH\" -P $SERVER_PORT $ssh_opts"
    elif [ -f "backend/deploy/key/id_ed25519" ]; then
        echo "scp -i backend/deploy/key/id_ed25519 -P $SERVER_PORT $ssh_opts"
    elif [ -f "backend/deploy/key/id_rsa" ]; then
        echo "scp -i backend/deploy/key/id_rsa -P $SERVER_PORT $ssh_opts"
    elif [ -f "$HOME/.ssh/id_ed25519" ]; then
        echo "scp -i \"$HOME/.ssh/id_ed25519\" -P $SERVER_PORT $ssh_opts"
    elif [ -f "$HOME/.ssh/id_rsa" ]; then
        echo "scp -i \"$HOME/.ssh/id_rsa\" -P $SERVER_PORT $ssh_opts"
    elif [ -n "$SSH_PASSWORD" ]; then
        echo "sshpass -e scp -P $SERVER_PORT $ssh_opts"
    else
        error_exit "未找到 SSH 认证方式"
    fi
}

###############################################################################
# 主流程
###############################################################################
main() {
    log_info "=========================================="
    log_info "远程初始化部署"
    log_info "=========================================="
    log_info "服务器: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}"
    log_info "仓库: $REPO_URL"
    log_info "分支: $BRANCH"
    log_info "部署目录: $DEPLOY_DIR"
    if [ -n "$FORCE" ]; then
        log_warn "强制模式: --force (将删除已存在的部署目录)"
    fi
    echo ""

    # 构建 SSH 命令
    SSH_CMD=$(build_ssh_command)
    SCP_CMD=$(build_scp_command)

    # 测试连接
    log_step "测试 SSH 连接..."
    if $SSH_CMD "echo 'Connection successful'" > /dev/null 2>&1; then
        log_info "SSH 连接成功"
    else
        log_error "SSH 连接失败，请检查网络和认证信息"
        log_error "SSH 命令: $SSH_CMD"
        exit 1
    fi
    

    # 获取远程脚本路径
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    INIT_SCRIPT="$SCRIPT_DIR/script/deploy_init.sh"

    if [ ! -f "$INIT_SCRIPT" ]; then
        error_exit "找不到 deploy_init.sh: $INIT_SCRIPT"
    fi

    # 传输脚本到远程
    log_step "传输部署脚本到远程服务器..."
    REMOTE_INIT="/tmp/remote-init-$$.sh"
    $SCP_CMD "$INIT_SCRIPT" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_INIT}" || error_exit "传输脚本失败"
    log_info "脚本传输完成"

    # 远程执行脚本
    log_step "在远程服务器执行初始化..."
    echo ""

    # 使用环境变量设置密码（如果使用密码认证）
    REMOTE_EXEC=""
    if [ -n "$SSH_PASSWORD" ]; then
        REMOTE_EXEC="export SSHPASS='$SSH_PASSWORD'; "
    fi

    # 构建远程命令
    REMOTE_CMD="${REMOTE_EXEC}bash $REMOTE_INIT \"$REPO_URL\" \"$BRANCH\" \"$DEPLOY_DIR\" $FORCE"

    # 执行远程脚本
    eval "$SSH_CMD \"$REMOTE_CMD\"" || error_exit "远程初始化失败 (临时文件: $REMOTE_INIT)"

    echo ""

    # 清理临时文件
    log_step "清理临时文件..."
    if ! $SSH_CMD "rm -f $REMOTE_INIT" 2>/dev/null; then
        log_warn "临时文件清理失败，请手动删除: $REMOTE_INIT"
    fi

    log_info "=========================================="
    log_info "初始化完成！"
    log_info "=========================================="
    echo ""
    log_info "后续步骤:"
    echo "  1. SSH 登录服务器:"
    echo "     ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST}"
    echo ""
    echo "  2. 编辑配置文件:"
    echo "     vi ${DEPLOY_DIR}backend/config.yaml"
    echo ""
    echo "  3. 运行数据库迁移:"
    echo "     cd ${DEPLOY_DIR}backend && uv run python src/app/init/sync_database_schema.py"
    echo ""
    echo "  4. 启动服务:"
    echo "     supervisorctl start tg-download"
    echo ""
}

main
