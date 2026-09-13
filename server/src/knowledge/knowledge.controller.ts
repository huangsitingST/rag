import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards
} from '@nestjs/common'
import type { AuthUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { DatabaseAuthGuard } from '../auth/database-auth.guard.js'
import { QueryKnowledgeDto } from './knowledge.dto.js'
import { KnowledgeService } from './knowledge.service.js'

@Controller('knowledge')
@UseGuards(DatabaseAuthGuard)
export class KnowledgeController {
	constructor(private readonly knowledge: KnowledgeService) {}

	/** 接收用户问题，并使用当前登录身份执行知识库问答。 */
	@Post('query')
	@HttpCode(HttpStatus.OK)
	query(
		@CurrentUser() user: AuthUser,
		@Body() body: QueryKnowledgeDto
	) {
		return this.knowledge.query(user, body.question.trim())
	}
}
