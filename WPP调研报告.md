## 报告


### 结构足够简单，没过度抽象
- apps 放业务代码
  - 子项目代码，一个子项目一个目录。（README说的是子系统，我觉得应该叫模块）
  - 每个子项目，都有自己的 model，router，service，utils 等（ 类似微信小程序把 js/css/html 放一起）
  - model 数据库模型
  - router 路由入口
  - service 业务逻辑
  - utils 子项目组件
  - schema 与其他外部系统通信用的数据结构
  - ...其他（cache/等）
- constants 常量（可以和 enums一起）
- dbs 全局 db 对象 （可以把 mysql，redis 等放一起）
- docker 部署
- enums 枚举
- 全局异常，都在一起
- middlewares 中间件
- migrations 没看懂，跳过
- routers 路由
- static 不知道什么用，跳过
- utils 公共组件
  

### 部署
- 用docker 打包当前项目，上传到云服务器
- 启动容器
- 访问容器端口


### 已有的组件
- mysql
- redis
- redis-lock
- jwt
- google_login
- RequestUtil
  - 也许应该打包到路由入口，设置一个上下文对象储存当前 user_ctx 用户信息
  - get_request_ctx = {id:"",user_info:{},"cookies":{}}

### 缺点
1. APP模块（子项目）规范比较差，比如 service，有时一个文件，有时建多一层目录
2. fastapi 的中间件 和 exceptions 强制异步。在里面的同步操作会阻塞整个整个进程
3. 白名单硬编码，容易漏
    # 白名单URL，不需要校验token
    white_url_regex_list = [
        "^/docs",
        "^/openapi",
        "/hsmaster/api/upload/cross-device/update-result$",
        "/hsmaster/api/upload/cross-device/get-result$",
    ]







## 考虑点

### Redis 是否持久化
### Redis 故障处理
### nginx 做基于 ip 的限流
### 如何部署