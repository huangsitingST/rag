import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import type { Request } from 'express'
import { UsersService } from './users.service.js'

@Injectable()
export class DatabaseAuthGuard implements CanActivate {
	constructor(private readonly users: UsersService) {}

	/**
	 * 根据 Bearer Token 从 MongoDB 恢复用户身份，并写入当前请求。
	 * 后续权限 Filter 只使用服务端确认的用户，避免信任客户端传入的权限字段。
	 */
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>()
		const authorization = request.headers.authorization
		const token = authorization?.startsWith('Bearer ')
			? authorization.slice('Bearer '.length)
			: undefined
		const user = token ? await this.users.findByToken(token) : null

		if (!user) {
			throw new UnauthorizedException('请先选择一个有效用户。')
		}

		request.user = user
		return true
	}
}
