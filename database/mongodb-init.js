/*
 * 教育企业教师与服务人员对话 RAG 数据库初始化脚本。
 * 连接方式：
 * mongosh "mongodb://root:root_password@127.0.0.1:27017/rag?authSource=admin" \
 *   database/mongodb-init.js
 */

const database = db.getSiblingDB("rag")

function ensureCollection(name, options = {}) {
  const exists = database.getCollectionInfos({ name }).length > 0

  if (exists) {
    if (options.validator) {
      database.runCommand({
        collMod: name,
        validator: options.validator,
        validationLevel: options.validationLevel ?? "moderate",
        validationAction: options.validationAction ?? "error",
      })
    }
    return
  }

  database.createCollection(name, options)
}

const roleCodes = ["teacher", "service_staff"]
const roleValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "roleCode",
      "roleName",
      "status",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      roleCode: {
        enum: roleCodes,
        description: "角色编码，只允许 teacher 和 service_staff",
      },
      roleName: {
        bsonType: "string",
        description: "角色名称",
      },
      description: {
        bsonType: "string",
        description: "角色说明",
      },
      status: {
        enum: ["active", "disabled"],
        description: "角色状态",
      },
      createdAt: {
        bsonType: "date",
      },
      updatedAt: {
        bsonType: "date",
      },
    },
  },
}

const userValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "_id",
      "username",
      "passwordHash",
      "displayName",
      "roleCode",
      "status",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: {
        bsonType: "string",
        description: "用户 UUID",
      },
      username: {
        bsonType: "string",
        description: "登录名，全局唯一",
      },
      passwordHash: {
        bsonType: "string",
        description: "密码哈希，不保存明文密码",
      },
      displayName: {
        bsonType: "string",
        description: "用户显示名称",
      },
      roleCode: {
        enum: roleCodes,
        description: "用户角色，只允许 teacher 和 service_staff",
      },
      status: {
        enum: ["active", "disabled"],
        description: "用户状态",
      },
      lastLoginAt: {
        bsonType: ["date", "null"],
        description: "最后登录时间",
      },
      createdAt: {
        bsonType: "date",
      },
      updatedAt: {
        bsonType: "date",
      },
    },
  },
}

const conversationValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "conversationId",
      "userId",
      "roleCode",
      "userName",
      "title",
      "createdAt",
      "updatedAt",
      "messageCount",
    ],
    properties: {
      conversationId: {
        bsonType: "string",
      },
      userId: {
        bsonType: "string",
        description: "发起会话的用户 UUID",
      },
      roleCode: {
        enum: roleCodes,
        description: "发起会话时的角色快照",
      },
      userName: {
        bsonType: "string",
      },
      title: {
        bsonType: "string",
      },
      createdAt: {
        bsonType: "date",
      },
      updatedAt: {
        bsonType: "date",
      },
      messageCount: {
        bsonType: "int",
        minimum: 0,
      },
    },
  },
}

const messageValidator = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "id",
      "conversationId",
      "userId",
      "roleCode",
      "question",
      "userName",
      "createdAt",
      "status",
      "result",
    ],
    properties: {
      id: {
        bsonType: "string",
      },
      conversationId: {
        bsonType: "string",
      },
      userId: {
        bsonType: "string",
        description: "提问用户 UUID",
      },
      roleCode: {
        enum: roleCodes,
        description: "提问时的角色快照",
      },
      question: {
        bsonType: "string",
      },
      userName: {
        bsonType: "string",
      },
      createdAt: {
        bsonType: "date",
      },
      status: {
        enum: ["pending", "answered", "error"],
      },
      result: {
        bsonType: "object",
        required: ["status", "answer", "sources", "pipeline"],
        properties: {
          status: {
            enum: ["answered", "insufficient_evidence"],
          },
          answer: {
            bsonType: "string",
          },
          sources: {
            bsonType: "array",
          },
          pipeline: {
            bsonType: "object",
          },
        },
      },
      errorMessage: {
        bsonType: "string",
      },
    },
  },
}

ensureCollection("rag_roles", {
  validator: roleValidator,
  validationLevel: "strict",
  validationAction: "error",
})

ensureCollection("rag_users", {
  validator: userValidator,
  validationLevel: "strict",
  validationAction: "error",
})

ensureCollection("rag_conversations", {
  validator: conversationValidator,
  validationLevel: "moderate",
  validationAction: "error",
})

ensureCollection("rag_messages", {
  validator: messageValidator,
  validationLevel: "moderate",
  validationAction: "error",
})

database.rag_roles.createIndex(
  { roleCode: 1 },
  { name: "uq_role_code", unique: true },
)

database.rag_users.createIndex(
  { username: 1 },
  { name: "uq_username", unique: true },
)

database.rag_users.createIndex(
  { roleCode: 1, status: 1 },
  { name: "ix_role_status" },
)

database.rag_conversations.createIndex(
  { conversationId: 1 },
  { name: "uq_conversation_id", unique: true },
)

database.rag_conversations.createIndex(
  { userId: 1, updatedAt: -1 },
  { name: "ix_conversation_user_updated_at" },
)

database.rag_conversations.createIndex(
  { roleCode: 1, updatedAt: -1 },
  { name: "ix_conversation_role_updated_at" },
)

database.rag_messages.createIndex(
  { id: 1 },
  { name: "uq_message_id", unique: true },
)

database.rag_messages.createIndex(
  { conversationId: 1, createdAt: 1 },
  { name: "ix_message_conversation_created_at" },
)

database.rag_messages.createIndex(
  { userName: 1, createdAt: -1 },
  { name: "ix_message_user_name_created_at" },
)

database.rag_messages.createIndex(
  { "result.status": 1, createdAt: -1 },
  { name: "ix_message_result_status_created_at" },
)

database.rag_messages.createIndex(
  { userId: 1, createdAt: -1 },
  { name: "ix_message_user_created_at" },
)

database.rag_messages.createIndex(
  { roleCode: 1, createdAt: -1 },
  { name: "ix_message_role_created_at" },
)

const now = new Date()

database.rag_roles.updateOne(
  { _id: "teacher" },
  {
    $set: {
      roleCode: "teacher",
      roleName: "教师",
      description: "教育企业教师，可查询教师权限范围内的知识与问答",
      status: "active",
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
    },
  },
  { upsert: true },
)

database.rag_roles.updateOne(
  { _id: "service_staff" },
  {
    $set: {
      roleCode: "service_staff",
      roleName: "企业服务人员",
      description: "教育企业服务人员，可查询服务人员权限范围内的知识与问答",
      status: "active",
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
    },
  },
  { upsert: true },
)

printjson({
  database: database.getName(),
  collections: [
    "rag_roles",
    "rag_users",
    "rag_conversations",
    "rag_messages",
  ],
  roles: database.rag_roles
    .find({}, { _id: 1, roleCode: 1, roleName: 1, status: 1 })
    .sort({ _id: 1 })
    .toArray(),
  indexes: {
    rag_roles: database.rag_roles.getIndexes().map((index) => index.name),
    rag_users: database.rag_users.getIndexes().map((index) => index.name),
    rag_conversations: database.rag_conversations
      .getIndexes()
      .map((index) => index.name),
    rag_messages: database.rag_messages
      .getIndexes()
      .map((index) => index.name),
  },
})
