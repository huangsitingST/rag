import { Injectable } from "@nestjs/common";
import type { Collection, Document } from "mongodb";
import { MongodbService } from "../mongodb/mongodb.service.js";
import type { AuthUser, UserRole, UserRoleCode } from "./auth.types.js";

export interface UserDocument extends Document {
  _id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  roleCode: UserRoleCode;
  status: "active" | "disabled";
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly mongodb: MongodbService) {}

  /** 查询所有启用用户，供身份切换器直接使用数据库数据。 */
  async listActiveUsers(): Promise<AuthUser[]> {
    const rows = await this.collection
      .find({ status: "active" })
      .sort({ displayName: 1, _id: 1 })
      .toArray();

    return rows.map((row) => this.toAuthUser(row));
  }

  /** 根据浏览器保存的身份 Token 从数据库恢复当前用户。 */
  async findByToken(token: string): Promise<AuthUser | null> {
    const row = await this.collection.findOne({
      _id: token,
      status: "active",
    });
    return row ? this.toAuthUser(row) : null;
  }

  /** 根据登录名查找启用用户，供数据导入脚本定位权属身份。 */
  async findByUsername(username: string): Promise<AuthUser | null> {
    const row = await this.collection.findOne({
      username,
      status: "active",
    });
    return row ? this.toAuthUser(row) : null;
  }

  private get collection(): Collection<UserDocument> {
    return this.mongodb.getCollection<UserDocument>("rag_users");
  }

  private toAuthUser(document: UserDocument): AuthUser {
    return {
      token: document._id,
      id: document._id,
      username: document.username,
      name: document.displayName,
      role: this.toRole(document.roleCode),
      roleCode: document.roleCode,
    };
  }

  private toRole(roleCode: UserRoleCode): UserRole {
    return roleCode === "teacher" ? "teacher" : "service_staff";
  }
}
