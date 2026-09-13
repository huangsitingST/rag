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

    if (request.user?.role !== "service_staff") {
      throw new ForbiddenException("只有企业管理员角色可以访问管理员接口。");
    }

    return true;
  }
}
