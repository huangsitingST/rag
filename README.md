# 企业知识库实战

这是第二章的综合项目，包含 NestJS 后端、Vue 3 前端、Milvus 混合检索、文档版本更新、权限隔离、Rerank、来源引用和拒答。

## 运行环境

- Node.js 22.12.0 以上
- Docker Desktop
- 智谱 API Key

在 `server/.env` 中配置：

```dotenv
ZHIPU_API_KEY=你的智谱 API Key
EMBEDDING_MODEL=embedding-3
EMBEDDING_DIMENSIONS=512
RERANK_MODEL=rerank
CHAT_MODEL=glm-4.7-flash

MILVUS_ADDRESS=127.0.0.1:19530
MILVUS_COLLECTION=enterprise_knowledge_chunks

MONGODB_URI=mongodb://root:root_password@127.0.0.1:27017/?authSource=admin
MONGODB_DATABASE=rag
```

## 启动

```bash
nvm use
npm install
docker compose up -d --wait --wait-timeout 180
npm run doctor
npm run seed
npm run dev
```

打开 <http://localhost:5173>。

项目不会自动重置 Collection。重复执行 `npm run seed` 时，内容与权限没有变化的文档会跳过向量化。

## 数据库集合

面向教育企业教师和企业服务人员的 MongoDB 集合定义位于 `database/mongodb-init.js`，包含：

- `rag_roles`：固定为 `teacher` 和 `service_staff` 两个角色。
- `rag_users`：保存登录信息、显示名称、角色和启停状态。
- `rag_conversations`：保存一轮会话。
- `rag_messages`：保存问题、处理状态、RAG 回答、来源和检索链路。

初始化命令：

```bash
mongosh "mongodb://root:root_password@127.0.0.1:27017/rag?authSource=admin" database/mongodb-init.js
```

字段映射说明见 `database/README.md`。
