export interface UserProfile {
	token: string
	id: string
	username: string
	name: string
	departmentName: string
	role: 'teacher' | 'service_staff'
	roleCode: 'teacher' | 'service_staff'
}

export interface DocumentSummary {
	documentId: string
	title: string
	version: number
	visibility: 'company' | 'department'
	checksum: string
	sourcePath: string
	chunkCount: number
	updatedAt: number
}

export interface QuerySource {
	chunkId: string
	documentId: string
	title: string
	version: number
	chunkIndex: number
	sourcePath: string
	content: string
}

export interface QueryResult {
	status: 'answered' | 'insufficient_evidence'
	answer: string
	sources: QuerySource[]
	pipeline: {
		permissionFilter: string
		recalledCount: number
		rerankedCount: number
		latencyMs: number
		candidates: Array<{
			rank: number
			chunkId: string
			title: string
			version: number
			retrievalScore: number
			rerankScore: number
			content: string
		}>
	}
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
	status: 'pending' | 'answered' | 'error'
	result?: QueryResult
	error?: string
}
