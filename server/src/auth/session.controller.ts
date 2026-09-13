import { Controller, Get } from '@nestjs/common'
import { UsersService } from './users.service.js'

@Controller('session')
export class SessionController {
	constructor(private readonly users: UsersService) {}

	/** 从 MongoDB 返回前端身份切换器需要的启用用户列表。 */
	@Get('users')
	listUsers() {
		return this.users.listActiveUsers()
	}
}
