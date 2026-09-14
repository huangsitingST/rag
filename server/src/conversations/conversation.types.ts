import type { Document } from 'mongodb'
import type { UserRoleCode } from '../auth/auth.types.js'
import type { KnowledgeService } from '../knowledge/knowledge.service.js'

export type ConversationMessageStatus = 'pending' | 'answered' | 'error'
export type StoredQueryResult = Awaited<
	ReturnType<KnowledgeService['query']>
>

export interface ConversationDocument extends Document {
	conversationId: string
	userId: string
	roleCode: UserRoleCode
	userName: string
	title: string
	createdAt: Date
	updatedAt: Date
	messageCount: number
}

export interface ConversationMessageDocument extends Document {
	id: string
	conversationId: string
	userId: string
	roleCode: UserRoleCode
	userName: string
	question: string
	createdAt: Date
	status: ConversationMessageStatus
	result: StoredQueryResult
	errorMessage?: string
}

export interface ConversationSummary {
	id: string
	title: string
	createdAt: number
	updatedAt: number
	messageCount: number
}

export interface ConversationMessage {
	id: string
	conversationId: string
	question: string
	userName: string
	createdAt: number
	status: ConversationMessageStatus
	result?: StoredQueryResult
	error?: string
}
