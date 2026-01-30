## 项目基础结构,所有子项目放在一起，monorepo结构。
backend
    - fastapi + nginx
    - 数据库：mysql
    - 缓存：redis
    - 部署：
desk
    - electron
    - vite + vue3.5
    - https://github.com/vbenjs/vue-vben-admin
admin
    - electron （ 需要支持win7？ ）
    - vite + vue3.5
    - https://github.com/vbenjs/vue-vben-admin
docs 文档
    - rule
    - feat
    - task
    - design
    - prd



## 后端考虑点
- 复用 hsmaster 相关组件

### Redis 是否持久化


### Redis 故障处理
- 整个服务不可用

### nginx 做基于 ip 的限流


### 如何部署
- 

### 如何重启


## 前端考虑点