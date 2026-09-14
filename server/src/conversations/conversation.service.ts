import { randomUUID } from 'node:crypto'
import {
	Injectable,
	NotFoundException,
	OnModuleInit
} from '@nestjs/common'
import type { Collection } from 'mongodb'
import type { AuthUser } from '../auth/auth.types.js'
import { KnowledgeService } from '../knowledge/knowledge.service.js'
import { MongodbService } from '../mongodb/mongodb.service.js'
import type {
	ConversationDocument,
	ConversationMessage,
	ConversationMessageDocument,
	ConversationSummary
} from './conversation.types.js'

@Injectable()
export class ConversationService implements OnModuleInit {
	constructor(
		private readonly mongodb: MongodbService,
		private readonly knowledge: KnowledgeService
	) {}

	async onModuleInit(): Promise<void> {
		await Promise.all([
			this.conversations.createIndex(
				{ userId: 1, updatedAt: -1 },
				{ name: 'ix_conversation_user_updated_at' }
			),
			this.messages.createIndex(
				{ conversationId: 1, createdAt: 1 },
				{ name: 'ix_message_conversation_created_at' }
			)
		])
	}

	/** 返回当前用户的会话列表，最近更新的会话排在前面。 */
	async listConversations(user: AuthUser): Promise<ConversationSummary[]> {
		const rows = await this.conversations
			.find({ userId: user.id })
			.sort({ updatedAt: -1 })
			.toArray()

		return rows.map((row) => this.toConversationSummary(row))
	}

	/** 新建一个空会话，首条问题发送后会自动补充标题。 */
	async createConversation(
		user: AuthUser,
		title?: string
	): Promise<ConversationSummary> {
		const now = new Date()
		const conversationId = randomUUID()
		const conversation: ConversationDocument = {
			conversationId,
			userId: user.id,
			roleCode: user.roleCode,
			userName: user.name,
			title: title?.trim() || '新对话',
			createdAt: now,
			updatedAt: now,
			messageCount: 0
		}

		await this.conversations.insertOne(conversation)
		return this.toConversationSummary(conversation)
	}

	/** 返回指定会话中的全部消息。 */
	async listMessages(
		user: AuthUser,
		conversationId: string
	): Promise<ConversationMessage[]> {
		await this.getOwnedConversation(user, conversationId)
		const rows = await this.messages
			.find({ conversationId, userId: user.id })
			.sort({ createdAt: 1 })
			.toArray()

		return rows.map((row) => this.toConversationMessage(row))
	}

	/**
	 * 执行一次问答并落库。
	 * 先保存 pending 消息，再调用模型；即使模型失败，问题也不会丢失。
	 */
	async sendMessage(
		user: AuthUser,
		conversationId: string,
		question: string
	) {
		const conversation = await this.getOwnedConversation(user, conversationId)
		const now = new Date()
		const message: ConversationMessageDocument = {
			id: randomUUID(),
			conversationId,
			userId: user.id,
			roleCode: user.roleCode,
			userName: user.name,
			question,
			createdAt: now,
			status: 'pending',
			result: {
				status: 'insufficient_evidence',
				answer: '',
				sources: [],
				pipeline: {
					permissionFilter: '',
					recalledCount: 0,
					rerankedCount: 0,
					latencyMs: 0,
					candidates: []
				}
			}
		}

		await this.messages.insertOne(message)

		let persisted = message
		try {
			const result = await this.knowledge.query(user, question)
			persisted = {
				...message,
				status: 'answered',
				result
			}
		} catch (error) {
			persisted = {
				...message,
				status: 'error',
				errorMessage:
					error instanceof Error ? error.message : String(error)
			}
		}

		await this.messages.updateOne(
			{ id: message.id, userId: user.id },
			{
				$set: {
					status: persisted.status,
					result: persisted.result,
					...(persisted.errorMessage
						? { errorMessage: persisted.errorMessage }
						: {})
				}
			}
		)

		const title =
			conversation.messageCount === 0 && conversation.title === '新对话'
				? this.createTitle(question)
				: conversation.title
		await this.conversations.updateOne(
			{ conversationId, userId: user.id },
			{
				$inc: { messageCount: 1 },
				$set: {
					title,
					updatedAt: new Date()
				}
			}
		)

		return {
			conversation: this.toConversationSummary({
				...conversation,
				title,
				updatedAt: new Date(),
				messageCount: conversation.messageCount + 1
			}),
			message: this.toConversationMessage(persisted)
		}
	}

	/** 删除一个会话及其全部消息。 */
	async deleteConversation(user: AuthUser, conversationId: string) {
		const result = await this.conversations.deleteOne({
			conversationId,
			userId: user.id
		})
		if (result.deletedCount === 0) {
			throw new NotFoundException('没有找到这个会话。')
		}

		await this.messages.deleteMany({
			conversationId,
			userId: user.id
		})
		return { status: 'deleted', conversationId }
	}

	/** 清空当前用户全部会话和消息。 */
	async clearConversations(user: AuthUser) {
		const conversations = await this.conversations
			.find({ userId: user.id })
			.project({ conversationId: 1 })
			.toArray()
		const conversationIds = conversations.map((row) => row.conversationId)

		const [conversationResult, messageResult] = await Promise.all([
			this.conversations.deleteMany({ userId: user.id }),
			this.messages.deleteMany({
				userId: user.id,
				conversationId: { $in: conversationIds }
			})
		])

		return {
			status: 'deleted',
			conversationCount: conversationResult.deletedCount,
			messageCount: messageResult.deletedCount
		}
	}

	private async getOwnedConversation(
		user: AuthUser,
		conversationId: string
	): Promise<ConversationDocument> {
		const conversation = await this.conversations.findOne({
			conversationId,
			userId: user.id
		})
		if (!conversation) throw new NotFoundException('没有找到这个会话。')
		return conversation
	}

	private get conversations(): Collection<ConversationDocument> {
		return this.mongodb.getCollection<ConversationDocument>('rag_conversations')
	}

	private get messages(): Collection<ConversationMessageDocument> {
		return this.mongodb.getCollection<ConversationMessageDocument>('rag_messages')
	}

	private toConversationSummary(
		document: ConversationDocument
	): ConversationSummary {
		return {
			id: document.conversationId,
			title: document.title,
			createdAt: document.createdAt.getTime(),
			updatedAt: document.updatedAt.getTime(),
			messageCount: document.messageCount
		}
	}

	private toConversationMessage(
		document: ConversationMessageDocument
	): ConversationMessage {
		return {
			id: document.id,
			conversationId: document.conversationId,
			question: document.question,
			userName: document.userName,
			createdAt: document.createdAt.getTime(),
			status: document.status,
			result: document.result,
			error: document.errorMessage
		}
	}

	private createTitle(question: string): string {
		const normalized = question.replace(/\s+/g, ' ').trim()
		return normalized.length > 28 ? `${normalized.slice(0, 28)}...` : normalized
	}
}
