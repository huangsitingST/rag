import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class AdminGuard implements CanActivate {
  /** 限制文档上传和版本更新接口只能由教师角色调用。 */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.user?.role !== "teacher") {
      throw new ForbiddenException("只有教师角色可以维护知识库文档。");
    }

    return true;
  }
}
