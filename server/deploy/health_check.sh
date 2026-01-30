#!/bin/bash
set -e

###############################################################################
# 健康检查脚本
# 用法: ./health_check.sh [url]
#
# 示例:
#   ./health_check.sh                    # 使用默认配置
#   ./health_check.sh http://localhost:9680/api/system/health
###############################################################################

HEALTH_URL="$1"
LOG_FILE="health_check.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# 如果没有提供 URL，从配置文件读取
if [ -z "$HEALTH_URL" ]; then
    if [ -f "config.yaml" ]; then
        PORT=$(grep -oP 'port:\s*\K\d+' config.yaml 2>/dev/null || echo "9680")
        HEALTH_URL="http://127.0.0.1:$PORT/api/system/health"
    else
        error_exit "未找到配置文件，请提供健康检查 URL"
    fi
fi

log "=========================================="
log "执行健康检查"
log "=========================================="
log "检查端点: $HEALTH_URL"

MAX_RETRIES=12
RETRY_DELAY=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))

    log "尝试 #$RETRY_COUNT..."

    # 执行健康检查
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        log "=========================================="
        log "健康检查通过！"
        log "=========================================="

        # 显示服务状态
        if command -v supervisorctl &> /dev/null; then
            log ""
            log "Supervisor 状态:"
            supervisorctl status tg-download
        fi

        exit 0
    fi

    log "HTTP 状态码: $HTTP_CODE"

    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        log "等待 $RETRY_DELAY 秒后重试..."
        sleep $RETRY_DELAY
    fi
done

log "=========================================="
log "健康检查失败！"
log "=========================================="
log "服务可能未正常启动，请检查日志"

# 显示最近的日志
if [ -f "log/supervisor_error.log" ]; then
    log ""
    log "最近的错误日志:"
    tail -n 20 log/supervisor_error.log
fi

error_exit "健康检查失败"
