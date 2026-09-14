import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { KnowledgeModule } from '../knowledge/knowledge.module.js'
import { ConversationController } from './conversation.controller.js'
import { ConversationService } from './conversation.service.js'

@Module({
	imports: [AuthModule, KnowledgeModule],
	controllers: [ConversationController],
	providers: [ConversationService]
})
export class ConversationsModule {}
