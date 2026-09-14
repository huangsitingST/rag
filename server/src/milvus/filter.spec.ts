import { describe, expect, it } from "vitest";
import type { AuthUser } from "../auth/auth.types.js";
import {
  buildDocumentFilter,
  buildPermissionFilter,
  escapeFilterValue,
} from "./filter.js";

const teacher: AuthUser = {
  token: "token",
  id: "user-1",
  username: "teacher",
  name: "测试用户",
  role: "teacher",
  roleCode: "teacher",
};

describe("Milvus permission filter", () => {
  it("企业管理员可以查看全部启用文档", () => {
    expect(buildPermissionFilter({ ...teacher, role: "service_staff" })).toBe(
      "is_active == true",
    );
  });

  it("教师只能查看企业公开的启用文档", () => {
    expect(buildPermissionFilter(teacher)).toBe(
      'is_active == true and visibility == "company"',
    );
  });

  it("查询文档历史时可以包含非启用版本", () => {
    expect(buildDocumentFilter("doc-1")).toBe('document_id == "doc-1"');
  });

  it("转义用户值，避免破坏 filter 表达式", () => {
    expect(escapeFilterValue('a"b\\c')).toBe('a\\"b\\\\c');
  });
});
