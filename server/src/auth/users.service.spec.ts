import { describe, expect, it, vi } from "vitest";
import type { MongodbService } from "../mongodb/mongodb.service.js";
import { UsersService, type UserDocument } from "./users.service.js";

const user: UserDocument = {
  _id: "user-1",
  username: "admin",
  passwordHash: "not-returned",
  displayName: "管理员",
  roleCode: "teacher",
  status: "active",
  lastLoginAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function createService() {
  const find = {
    sort: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([user]),
  };
  const findOne = vi.fn().mockResolvedValue(user);
  const collection = { find: vi.fn().mockReturnValue(find), findOne };
  const mongodb = {
    getCollection: vi.fn().mockReturnValue(collection),
  } as unknown as MongodbService;

  return {
    service: new UsersService(mongodb),
    find,
    findOne,
  };
}

describe("UsersService", () => {
  it("从 MongoDB 查询启用用户并映射为鉴权身份", async () => {
    const { service, find } = createService();

    const users = await service.listActiveUsers();

    expect(find.sort).toHaveBeenCalledWith({ displayName: 1, _id: 1 });
    expect(users).toEqual([
      {
        token: "user-1",
        id: "user-1",
        username: "admin",
        name: "管理员",
        role: "teacher",
        roleCode: "teacher",
      },
    ]);
    expect(users[0]).not.toHaveProperty("passwordHash");
  });

  it("按 Token 和启用状态从 MongoDB 恢复用户", async () => {
    const { service, findOne } = createService();

    const result = await service.findByToken("user-1");

    expect(findOne).toHaveBeenCalledWith({
      _id: "user-1",
      status: "active",
    });
    expect(result?.name).toBe("管理员");
  });
});
