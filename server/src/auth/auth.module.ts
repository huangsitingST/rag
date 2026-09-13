import { Module } from '@nestjs/common'
import { AdminGuard } from './admin.guard.js'
import { DatabaseAuthGuard } from './database-auth.guard.js'
import { SessionController } from './session.controller.js'
import { UsersService } from './users.service.js'

@Module({
	controllers: [SessionController],
	providers: [UsersService, DatabaseAuthGuard, AdminGuard],
	exports: [UsersService, DatabaseAuthGuard, AdminGuard]
})
export class AuthModule {}
