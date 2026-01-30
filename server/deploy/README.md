# Backend 部署文档

## 概述

本项目使用 GitHub Actions + SSH 方式部署到 Linux 服务器，通过 Supervisor 管理服务。

## 目录结构

```
backend/deploy/
├── README.md              # 本文档
├── init.sh                # 初始化脚本（首次部署）
├── deploy.sh              # 部署脚本
├── rollback.sh            # 回滚脚本
├── health_check.sh        # 健康检查脚本
└── supervisor/
    └── tg-download.conf   # Supervisor 配置
```

## 首次部署

### 1. 服务器初始化

在服务器上运行初始化脚本：

```bash
# 使用 root 用户
sudo -i

# 下载并运行初始化脚本
bash /path/to/backend/deploy/init.sh <git_repo_url> [branch]
```

例如：
```bash
bash deploy/init.sh https://github.com/your-org/extension-tg-download.git main
```

初始化脚本会：
- 安装系统依赖 (Git, Supervisor, 编译工具)
- 安装 uv
- 使用 uv 安装 Python
- 克隆仓库到 `/data/extension-tg-download/`
- 配置 Supervisor

### 2. 配置环境

编辑配置文件：
```bash
vi /data/extension-tg-download//config.yaml
```

需要配置：
- 数据库连接
- Redis 连接
- JWT 密钥
- 其他业务配置

### 3. 运行数据库迁移

```bash
cd /data/extension-tg-download/
uv run python src/app/init/sync_database_schema.py
```

### 4. 启动服务

```bash
supervisorctl start tg-download
supervisorctl status tg-download
```

## 配置 GitHub Actions

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 | 示例值 |
|------------|------|--------|
| `SERVER_HOST` | 服务器 IP 或域名 | `192.168.1.100` |
| `SERVER_USER` | SSH 登录用户 | `root` |
| `SSH_PRIVATE_KEY` | SSH 私钥 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_PORT` | SSH 端口（可选） | `22` |
| `REPO_URL` | Git 仓库 URL | `git@github.com:your-org/repo.git` |
| `DEPLOY_DIR` | 部署目录 | `/data/extension-tg-download/` |
| `BACKUP_DIR` | 备份目录 | `/data/backups/extension-tg-download/` |
| `BRANCH` | 部署分支（可选） | `main` |
| `KEEP_VERSIONS` | 保留版本数（可选） | `5` |
| `HEALTH_CHECK_URL` | 健康检查 URL | `http://your-server:9680/api/system/health` |

### 生成 SSH 密钥

在本地生成 SSH 密钥对：
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions
```

将公钥添加到服务器：
```bash
cat ~/.ssh/github_actions.pub | ssh root@your-server "cat >> ~/.ssh/authorized_keys"
```

将私钥添加到 GitHub Secrets：
```bash
cat ~/.ssh/github_actions
# 复制整个内容（包括 BEGIN 和 END 行）
```

## CI/CD 流程

### 触发条件

1. 推送到 `main` 分支
2. 手动触发 (workflow_dispatch)

### 执行步骤

1. **质量检查**
   - Ruff 代码检查
   - Black 格式检查
   - Mypy 类型检查
   - Pytest 测试

2. **部署**
   - SSH 连接服务器
   - 备份当前版本
   - 拉取最新代码
   - 安装/更新依赖
   - 运行数据库迁移
   - 重启服务

3. **健康检查**
   - 检查服务是否正常启动

## 手动部署

如果需要手动部署，在服务器上运行：

```bash
cd /data/extension-tg-download/
bash deploy/deploy.sh <repo_url> <branch> <backup_dir> <keep_versions>
```

## 回滚

### 自动回滚

如果部署失败，GitHub Actions 会提示回滚命令。

### 手动回滚

```bash
cd /data/extension-tg-download/

# 列出可用备份
ls -la /data/backups/extension-tg-download//

# 回滚到指定版本
bash deploy/rollback.sh /data/backups/extension-tg-download//backup_20250122_120000
```

或使用交互式：
```bash
bash deploy/rollback.sh
```

## 常用命令

### 服务管理

```bash
# 启动服务
supervisorctl start tg-download

# 停止服务
supervisorctl stop tg-download

# 重启服务
supervisorctl restart tg-download

# 查看状态
supervisorctl status tg-download

# 查看日志
supervisorctl tail tg-download
```

### 日志查看

```bash
# Supervisor 日志
tail -f /data/extension-tg-download//log/supervisor.log

# 错误日志
tail -f /data/extension-tg-download//log/supervisor_error.log

# 应用日志
tail -f /data/extension-tg-download//log/app.log
```

### 健康检查

```bash
# 手动运行健康检查
cd /data/extension-tg-download/
bash deploy/health_check.sh

# 或直接请求
curl http://localhost:9680/api/system/health
```

## 故障排查

### 服务启动失败

1. 查看错误日志：
   ```bash
   tail -f /data/extension-tg-download//log/supervisor_error.log
   ```

2. 检查配置文件：
   ```bash
   cat /data/extension-tg-download//config.yaml
   ```

3. 手动测试启动：
   ```bash
   cd /data/extension-tg-download/
   .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 9680
   ```

### 部署失败

1. 查看 GitHub Actions 日志

2. 在服务器上手动运行部署脚本：
   ```bash
   cd /data/extension-tg-download/
   bash deploy/deploy.sh
   ```

3. 如果需要回滚：
   ```bash
   bash deploy/rollback.sh /data/backups/extension-tg-download//backup_xxx
   ```

### 数据库迁移失败

1. 检查数据库连接：
   ```bash
   mysql -h localhost -u root -p
   ```

2. 手动运行迁移：
   ```bash
   cd /data/extension-tg-download/
   uv run python src/app/init/sync_database_schema.py
   ```

## 备份策略

- 每次部署前自动备份
- 保留最近 5 个版本
- 备份内容：
  - 源代码
  - 配置文件
  - Git commit 信息

备份位置：`/data/backups/extension-tg-download//`
