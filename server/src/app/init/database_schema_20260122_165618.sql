-- 数据库结构导出
-- 导出时间: 2026-01-22 16:56:18
-- 总表数: 6

-- 表: callback_logs
CREATE TABLE `callback_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `order_id` bigint NOT NULL COMMENT '订单ID',
  `order_no` varchar(32) NOT NULL COMMENT '订单号',
  `callback_url` varchar(512) DEFAULT NULL COMMENT '回调地址（记录用）',
  `request_body` text COMMENT '请求体（JSON）',
  `response_body` text COMMENT '响应体',
  `http_status` int DEFAULT NULL COMMENT 'HTTP状态码',
  `callback_status` varchar(20) NOT NULL COMMENT '回调状态',
  `error_message` text COMMENT '错误信息',
  `created_at` bigint NOT NULL COMMENT '创建时间（毫秒时间戳）',
  PRIMARY KEY (`id`),
  KEY `ix_callback_logs_order_no` (`order_no`),
  KEY `ix_callback_logs_order_id` (`order_id`),
  KEY `idx_callback_status` (`callback_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: mock_base_test_models
CREATE TABLE `mock_base_test_models` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: orders
CREATE TABLE `orders` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` varchar(32) NOT NULL COMMENT '订单号（业务唯一标识）',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `product_class` int NOT NULL COMMENT '商品类别（枚举值）',
  `product_id` varchar(64) NOT NULL COMMENT '商品ID（业务系统定义）',
  `product_name` varchar(128) NOT NULL COMMENT '商品名称（快照）',
  `product_desc` varchar(512) DEFAULT NULL COMMENT '商品描述（快照）',
  `amount_cents` int NOT NULL COMMENT '订单金额（美分）',
  `currency` varchar(8) NOT NULL COMMENT '货币类型',
  `order_status` varchar(20) NOT NULL COMMENT '订单状态',
  `callback_status` varchar(20) NOT NULL COMMENT '业务回调状态',
  `payment_method` varchar(32) DEFAULT NULL COMMENT '支付方式',
  `payment_channel_order_no` varchar(128) DEFAULT NULL COMMENT '支付渠道订单号',
  `created_at` bigint NOT NULL COMMENT '创建时间（毫秒时间戳）',
  `updated_at` bigint NOT NULL COMMENT '更新时间（毫秒时间戳）',
  `paid_at` bigint DEFAULT NULL COMMENT '支付时间（毫秒时间戳）',
  `expired_at` bigint NOT NULL COMMENT '订单过期时间（毫秒时间戳）',
  `client_ip` varchar(64) DEFAULT NULL COMMENT '客户端IP',
  `extra_metadata` text COMMENT '扩展元数据（JSON）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_order_status` (`order_status`),
  KEY `idx_product` (`product_class`,`product_id`),
  KEY `ix_orders_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: payment_records
CREATE TABLE `payment_records` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `order_id` bigint NOT NULL COMMENT '订单ID',
  `order_no` varchar(32) NOT NULL COMMENT '订单号',
  `payment_method` varchar(32) NOT NULL COMMENT '支付方式',
  `channel_order_no` varchar(128) DEFAULT NULL COMMENT '渠道订单号',
  `transaction_id` varchar(128) DEFAULT NULL COMMENT '交易ID',
  `amount_cents` int NOT NULL COMMENT '支付金额（美分）',
  `currency` varchar(8) NOT NULL COMMENT '货币类型',
  `callback_data` text COMMENT '回调原始数据（JSON）',
  `verified_at` bigint DEFAULT NULL COMMENT '验证时间（毫秒时间戳）',
  `created_at` bigint NOT NULL COMMENT '创建时间（毫秒时间戳）',
  `updated_at` bigint NOT NULL COMMENT '更新时间（毫秒时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_channel_order_no` (`payment_method`,`channel_order_no`),
  KEY `ix_payment_records_order_id` (`order_id`),
  KEY `ix_payment_records_transaction_id` (`transaction_id`),
  KEY `ix_payment_records_order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: user_subscriptions
CREATE TABLE `user_subscriptions` (
  `user_id` bigint NOT NULL COMMENT '用户 ID',
  `period` varchar(20) NOT NULL COMMENT '订阅周期: free/month/quarter/lifetime',
  `expires_at` bigint DEFAULT NULL COMMENT '订阅过期时间(毫秒时间戳), NULL表示永久',
  `created_at` bigint NOT NULL COMMENT '创建时间（毫秒时间戳）',
  `updated_at` bigint NOT NULL COMMENT '更新时间（毫秒时间戳）',
  PRIMARY KEY (`user_id`),
  KEY `idx_period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 表: users
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(64) DEFAULT NULL COMMENT '邮箱（登录用）',
  `password_hash` varchar(64) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL COMMENT '全名',
  `avatar_url` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `is_del` tinyint(1) NOT NULL COMMENT '是否注销',
  `last_login_at` bigint DEFAULT NULL COMMENT '最后登录时间(毫秒时间戳)',
  `login_count` int NOT NULL COMMENT '登录次数',
  `locked_until` bigint DEFAULT NULL COMMENT '锁定截止时间(毫秒时间戳)',
  `created_at` bigint NOT NULL COMMENT '创建时间（毫秒时间戳）',
  `updated_at` bigint NOT NULL COMMENT '更新时间（毫秒时间戳）',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

