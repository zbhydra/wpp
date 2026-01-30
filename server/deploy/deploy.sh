#!/bin/bash
set -e

###############################################################################
# 远程部署脚本 - 通过 SSH 远程执行部署更新
#
# 用法:
#   ./backend/deploy/deploy.sh [options]
#
# 选项:
#   --keep-versions N    保留最近 N 个版本 (默认: 5)
#   --no-backup          跳过备份步骤
#   --skip-health-check  跳过健康检查
#   --force              强制部署（忽略某些检查）
#
# 说明:
#   此脚本通过 SSH 连接到远程服务器，传输并执行远程部署脚本
###############################################################################

#===============================================================================
# 配置区域 - 修改这里的值
#===============================================================================

# 服务器连接信息
SERVER_HOST="8.134.199.211"          # 服务器 IP 或域名
SERVER_PORT="22"                      # SSH 端口
SERVER_USER="root"                    # SSH 用户

# 部署配置
DEPLOY_DIR="/data/extension-tg-download/"  # 部署目录
BACKUP_DIR="${DEPLOY_DIR}.backups/"       # 备份目录
KEEP_VERSIONS="5"                           # 保留版本数

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

# 参数解析
KEEP_VERSIONS_ARG=""
SKIP_BACKUP=""
SKIP_HEALTH_CHECK=""

for arg in "$@"; do
    case "$arg" in
        --keep-versions=*)
            KEEP_VERSIONS_ARG="${arg#*=}"
            ;;
        --no-backup)
            SKIP_BACKUP="--no-backup"
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK="--skip-health-check"
            ;;
        --force)
            # 传递给远程脚本
            ;;
        *)
            log_warn "未知参数: $arg"
            ;;
    esac
done

# 使用参数值或默认值
KEEP_VERSIONS="${KEEP_VERSIONS_ARG:-$KEEP_VERSIONS}"

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
    log_info "远程部署更新"
    log_info "=========================================="
    log_info "服务器: ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}"
    log_info "部署目录: $DEPLOY_DIR"
    log_info "备份目录: $BACKUP_DIR"
    log_info "保留版本: $KEEP_VERSIONS"
    if [ -n "$SKIP_BACKUP" ]; then
        log_warn "跳过备份: --no-backup"
    fi
    if [ -n "$SKIP_HEALTH_CHECK" ]; then
        log_warn "跳过健康检查: --skip-health-check"
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
    DEPLOY_SCRIPT="$SCRIPT_DIR/script/deploy_remote.sh"

    if [ ! -f "$DEPLOY_SCRIPT" ]; then
        error_exit "找不到 deploy_remote.sh: $DEPLOY_SCRIPT"
    fi

    # 传输脚本到远程
    log_step "传输部署脚本到远程服务器..."
    REMOTE_DEPLOY="/tmp/remote-deploy-$$.sh"
    $SCP_CMD "$DEPLOY_SCRIPT" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DEPLOY}" || error_exit "传输脚本失败"
    log_info "脚本传输完成"

    # 远程执行脚本
    log_step "在远程服务器执行部署..."
    echo ""

    # 使用环境变量设置密码（如果使用密码认证）
    REMOTE_EXEC=""
    if [ -n "$SSH_PASSWORD" ]; then
        REMOTE_EXEC="export SSHPASS='$SSH_PASSWORD'; "
    fi

    # 构建远程命令
    REMOTE_CMD="${REMOTE_EXEC}bash $REMOTE_DEPLOY \"$DEPLOY_DIR\" \"$BACKUP_DIR\" \"$KEEP_VERSIONS\" $SKIP_BACKUP $SKIP_HEALTH_CHECK"

    # 执行远程脚本
    eval "$SSH_CMD \"$REMOTE_CMD\"" || error_exit "远程部署失败 (临时文件: $REMOTE_DEPLOY)"

    echo ""

    # 清理临时文件
    log_step "清理临时文件..."
    if ! $SSH_CMD "rm -f $REMOTE_DEPLOY" 2>/dev/null; then
        log_warn "临时文件清理失败，请手动删除: $REMOTE_DEPLOY"
    fi

    log_info "=========================================="
    log_info "部署完成！"
    log_info "=========================================="
    echo ""
    log_info "如需回滚，运行:"
    echo "  ./backend/deploy/rollback.sh <backup_name>"
    echo ""
}

main
