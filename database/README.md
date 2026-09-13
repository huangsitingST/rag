# MongoDB 集合

`mongodb-init.js` 使用 MongoDB 8.0，在 `rag` 数据库中创建用户、角色、会话和问答集合及索引，并初始化两个固定角色。

```bash
mongosh "mongodb://root:root_password@127.0.0.1:27017/rag?authSource=admin" database/mongodb-init.js
```

## 集合关系

- `rag_roles`：只允许 `teacher`（教师）和 `service_staff`（企业服务人员）两个角色。
- `rag_users`：通过 `roleCode` 关联角色；系统只服务一个企业，因此 `username` 全局唯一。
- `rag_conversations`：一轮会话，通过 `userId`、`roleCode` 关联提问身份。
- `rag_messages`：一次问答，通过 `userId`、`roleCode` 关联提问身份，并保存问题、状态、回答、来源和检索链路。

MongoDB 不支持外键，`rag_users.roleCode` 由 JSON Schema 限制为 `teacher` 或 `service_staff`；业务层写入会话和消息时还需要确认 `userId` 和 `roleCode` 对应有效用户。`rag_messages.roleCode` 和 `rag_messages.userName` 同时作为提问时快照保存，用户后续改名或调整角色时，历史问答仍能按提问时身份审计。系统只服务一个企业，因此所有集合都不保存 `tenantId`。

## JSON 字段映射

| 对话 JSON | MongoDB 字段 |
| --- | --- |
| `id` | `rag_messages.id` |
| `question` | `rag_messages.question` |
| `userName` | `rag_messages.userName` |
| `createdAt` | `rag_messages.createdAt`，使用 BSON `Date` |
| `status` | `rag_messages.status` |
| `result.status` | `rag_messages.result.status` |
| `result.answer` | `rag_messages.result.answer` |
| `result.sources` | `rag_messages.result.sources` |
| `result.pipeline` | `rag_messages.result.pipeline` |

`rag_messages.result` 保留为内嵌文档，与现有问答 API 返回结构一致，不需要把 `sources` 和 `pipeline` 拆成额外集合。

## 常用查询

```javascript
db.rag_messages
  .find({ userId: "用户 UUID" })
  .sort({ createdAt: -1 })
  .limit(30)
```
