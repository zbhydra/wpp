## 分层
- 用户级 - ~/.claude/CLAUDE.md
- 项目级别 - ./.claude/CLAUDE.md


## 新增
```shell
# 记住我叫 hydra
```

## 引用
使用 @引用其他文件

## 例子
```md
# 项目核心上下文 (Project Context)

## 1. 项目全貌
> 这里的 @README.md 是项目的灵魂，包含业务目标与架构概览。
- 项目简介: 详见 @README.md

## 2. 工程规范 (Engineering Standards)
> 强制 AI 遵守团队既定的代码风格与协作流程。
- API 接口规范: 参考 @docs/api-guide.md
- Git 提交与分支策略: 严格遵循 @docs/git.md

## 3. 开发者偏好 (Personal Preferences)
> 这是一个巧妙的技巧：引用本地的全局配置文件，让 AI 记住你的个人编码习惯（如命名喜好、注释风格）。

- **我的专属配置**: @~/.claude/my-project-notes.md
```