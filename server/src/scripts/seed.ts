import { readFile } from "node:fs/promises";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import { UsersService } from "../auth/users.service.js";
import { DocumentService } from "../documents/document.service.js";

const samples: {
  username: string;
  fileName: string;
  title: string;
  visibility: "company" | "department";
}[] = [
  // {
  //   username: "chenchen",
  //   fileName: "bluewhale-company-refund.md",
  //   title: "蓝鲸科技退款规则",
  //   visibility: "company" as const,
  // },
  // {
  //   username: "chenchen",
  //   fileName: "bluewhale-customer-service.md",
  //   title: "客服人工审核流程",
  //   visibility: "department" as const,
  // },
  // {
  //   username: "chenchen",
  //   fileName: "bluewhale-finance.md",
  //   title: "财务对账与大额退款规则",
  //   visibility: "department" as const,
  // },
  // {
  //   username: "xuyan",
  //   fileName: "starlight-promotion.md",
  //   title: "星河零售会员活动",
  //   visibility: "company" as const,
  // },
];

/**
 * 导入项目预置的跨租户、跨部门样例文档。
 * 已存在的同名文档会进入更新流程，相同内容则由 checksum 自动跳过。
 */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  try {
    const documents = app.get(DocumentService);
    const users = app.get(UsersService);
    const sampleRoot = path.resolve(process.cwd(), "../sample-documents");

    for (const sample of samples) {
      const user = await users.findByUsername(sample.username);
      if (!user) throw new Error(`没有找到数据库用户：${sample.username}`);

      const content = await readFile(path.join(sampleRoot, sample.fileName));
      // 使用对应租户管理员查询文档，避免跨租户判断同名数据。
      const existing = (await documents.listDocuments(user)).find(
        (document) => document.title === sample.title,
      );
      const input = {
        title: sample.title,
        visibility: sample.visibility,
        fileName: sample.fileName,
        content,
      };
      const result = existing
        ? await documents.updateDocument(user, existing.documentId, input)
        : await documents.createDocument(user, input);

      console.log(`${sample.title}：${result.status}`);
    }
  } finally {
    await app.close();
  }
}

void main();
