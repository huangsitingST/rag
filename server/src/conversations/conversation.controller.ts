import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Post,
	UseGuards
} from '@nestjs/common'
import type { AuthUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/current-user.decorator.js'
import { DatabaseAuthGuard } from '../auth/database-auth.guard.js'
import {
	CreateConversationDto,
	SendConversationMessageDto
} from './conversation.dto.js'
import { ConversationService } from './conversation.service.js'

@Controller('conversations')
@UseGuards(DatabaseAuthGuard) // 这个会在响应接口前执行，通过token获取用户信息
export class ConversationController {
	constructor(private readonly conversations: ConversationService) {}
	@Get()
	list(@CurrentUser() user: AuthUser) {
		return this.conversations.listConversations(user)
	}

	@Post()
	create(
		@CurrentUser() user: AuthUser,
		@Body() body: CreateConversationDto
	) {
		return this.conversations.createConversation(user, body.title)
	}

	@Get(':conversationId/messages')
	listMessages(
		@CurrentUser() user: AuthUser,
		@Param('conversationId') conversationId: string
	) {
		return this.conversations.listMessages(user, conversationId)
	}

	@Post(':conversationId/messages')
	@HttpCode(HttpStatus.OK)
	sendMessage(
		@CurrentUser() user: AuthUser,
		@Param('conversationId') conversationId: string,
		@Body() body: SendConversationMessageDto
	) {
		return this.conversations.sendMessage(
			user,
			conversationId,
			body.question.trim()
		)
	}

	@Delete()
	clear(@CurrentUser() user: AuthUser) {
		return this.conversations.clearConversations(user)
	}

	@Delete(':conversationId')
	delete(
		@CurrentUser() user: AuthUser,
		@Param('conversationId') conversationId: string
	) {
		return this.conversations.deleteConversation(user, conversationId)
	}
}
