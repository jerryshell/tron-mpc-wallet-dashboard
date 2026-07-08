# Tron MPC Wallet Dashboard

波场 多方计算 钱包 仪表盘

## 前置条件

- 已部署 [mpcium](https://github.com/fystack/mpcium) 并确保 NATS 服务可访问
- [Bun](https://bun.sh) 运行环境
- 获取 `event_initiator.key` 私钥文件（由 mpcium 生成）
- （可选）[TronGrid API Key](https://www.trongrid.io/)

## 快速开始

```bash
cp .env.example .env           # 复制环境变量模板（内含完整说明）
vim .env                       # 填入配置
bun install                    # 安装依赖
bun dev                        # 启动开发服务器
```

## 可用脚本

| 脚本            | 用途           |
| --------------- | -------------- |
| `bun dev`       | 启动开发服务器 |
| `bun build`     | 生产构建       |
| `bun lint`      | 代码检查       |
| `bun format`    | 代码格式化     |
| `bun typecheck` | 类型检查       |
