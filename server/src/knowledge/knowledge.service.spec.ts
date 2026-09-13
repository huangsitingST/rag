import { describe, expect, it, vi } from "vitest";
import type { AiService } from "../ai/ai.service.js";
import type { AuthUser } from "../auth/auth.types.js";
import type { MilvusService } from "../milvus/milvus.service.js";
import type { RetrievedChunk } from "../milvus/milvus.types.js";
import { KnowledgeService } from "./knowledge.service.js";

const user: AuthUser = {
  token: "token",
  id: "u-1",
  username: "employee",
  name: "测试用户",
  role: "service_staff",
  roleCode: "service_staff",
};

const chunk: RetrievedChunk = {
  chunkId: "chunk-1",
  documentId: "document-1",
  version: 2,
  chunkIndex: 0,
  departmentId: "finance",
  visibility: "department",
  title: "报销规则",
  sourcePath: "bluewhale/document-1/v2.md",
  checksum: "hash",
  content: "单笔报销超过 5000 元需要财务负责人审批。",
  retrievalScore: 0.5,
  rerankScore: 0.98,
};

describe("KnowledgeService", () => {
  it("把模型返回的 Chunk ID 绑定到系统保存的真实来源", async () => {
    const ai = {
      createEmbeddings: vi.fn().mockResolvedValue([[0.1, 0.2]]),
      rerank: vi.fn().mockResolvedValue([chunk]),
      generateAnswer: vi.fn().mockResolvedValue({
        status: "answered",
        answer: "需要财务负责人审批。",
        sourceChunkIds: ["chunk-1"],
      }),
    } as unknown as AiService;
    const milvus = {
      hybridSearch: vi.fn().mockResolvedValue({
        filter: "is_active == true",
        chunks: [chunk],
      }),
    } as unknown as MilvusService;
    const service = new KnowledgeService(ai, milvus);

    const result = await service.query(user, "6000 元报销需要谁审批？");

    expect(result.status).toBe("answered");
    expect(result.sources[0]).toMatchObject({
      chunkId: "chunk-1",
      version: 2,
      sourcePath: "bluewhale/document-1/v2.md",
    });
  });
});
