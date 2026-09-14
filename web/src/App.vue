<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import {
	BookOpenText,
	Bot,
	Building2,
	CheckCircle2,
	ChevronDown,
	CircleAlert,
	Clock3,
	Database,
	FilePlus2,
	FileText,
	Globe2,
	Layers3,
	LoaderCircle,
	LockKeyhole,
	MessageSquareText,
	Plus,
	RefreshCw,
	Search,
	SendHorizontal,
	ShieldCheck,
	Sparkles,
	Trash2,
	Upload,
	Users,
	X
} from '@lucide/vue'
import {
	clearConversations,
	createConversation,
	deleteDocument,
	getConversationMessages,
	getConversations,
	getDocuments,
	getHealth,
	getUsers,
	saveDocument,
	sendConversationMessage
} from './api'
import type {
	ConversationMessage,
	ConversationSummary,
	DocumentSummary,
	UserProfile
} from './types'

type DocumentFilter = 'all' | 'company' | 'department'
type MobileView = 'query' | 'documents'

const users = ref<UserProfile[]>([])
const activeToken = ref('')
const userMenuOpen = ref(false)
const userSwitcherRef = ref<HTMLElement | null>(null)
const documents = ref<DocumentSummary[]>([])
const serverOnline = ref(false)
const loadingDocuments = ref(false)
const question = ref('')
const asking = ref(false)
const error = ref('')
const documentSearch = ref('')
const documentFilter = ref<DocumentFilter>('all')
const mobileView = ref<MobileView>('query')
const conversations = ref<ConversationSummary[]>([])
const activeConversationId = ref('')
const conversationTurns = ref<ConversationMessage[]>([])
const conversationRef = ref<HTMLElement | null>(null)
const loadingConversations = ref(false)
const creatingConversation = ref(false)

const showDocumentModal = ref(false)
const savingDocument = ref(false)
const deletingDocumentId = ref('')
const editingDocument = ref<DocumentSummary | null>(null)
const documentTitle = ref('')
const visibility = ref<'company' | 'department'>('company')
const selectedFile = ref<File | null>(null)
const saveMessage = ref('')
let documentRequestId = 0
let conversationRequestId = 0
let conversationMessageRequestId = 0

const ACTIVE_USER_STORAGE_KEY = 'enterprise-knowledge-active-user'
const ACTIVE_CONVERSATION_PREFIX = 'enterprise-knowledge-active-conversation:'

const suggestions = [
	'介绍一下爱学网这个系统',
	'BW-RF-2026 对应什么规则？',
	'app端怎么使用'
]

const activeUser = computed(() =>
	users.value.find((user) => user.token === activeToken.value)
)
const isAdmin = computed(() => activeUser.value?.role === 'service_staff')
const filteredDocuments = computed(() => {
	const keyword = documentSearch.value.trim().toLowerCase()
	return documents.value.filter((document) => {
		const matchedFilter =
			documentFilter.value === 'all' ||
			document.visibility === documentFilter.value
		const matchedKeyword =
			!keyword ||
			document.title.toLowerCase().includes(keyword)
		return matchedFilter && matchedKeyword
	})
})

/**
 * 初始化演示用户和后端状态，再加载默认身份能够访问的文档。
 */
onMounted(async () => {
	document.addEventListener('click', closeUserMenuOnOutsideClick)
	document.addEventListener('keydown', closeUserMenuOnEscape)
	try {
		const [userList] = await Promise.all([getUsers(), checkHealth()])
		users.value = userList
		const savedToken = localStorage.getItem(ACTIVE_USER_STORAGE_KEY)
			activeToken.value =
				userList.find((user) => user.token === savedToken)?.token ??
				userList[0]?.token ??
				''
			await Promise.all([loadDocuments(), loadConversations()])
	} catch (reason) {
		setError(reason)
	}
})

onBeforeUnmount(() => {
	document.removeEventListener('click', closeUserMenuOnOutsideClick)
	document.removeEventListener('keydown', closeUserMenuOnEscape)
})

/** 检查后端是否可用，并更新顶部服务状态。 */
async function checkHealth() {
	try {
		serverOnline.value = (await getHealth()).status === 'ok'
	} catch {
		serverOnline.value = false
	}
}

/**
 * 切换演示身份后加载对应身份的历史问答，并重新请求可访问文档。
 */
async function changeUser(user: UserProfile) {
	userMenuOpen.value = false
	if (user.token === activeToken.value) return

	activeToken.value = user.token
	localStorage.setItem(ACTIVE_USER_STORAGE_KEY, user.token)
	error.value = ''
	conversations.value = []
	activeConversationId.value = ''
	conversationTurns.value = []
	await Promise.all([loadDocuments(), loadConversations()])
	await scrollConversationToBottom()
}

/** 点击身份下拉框以外的区域时收起菜单。 */
function closeUserMenuOnOutsideClick(event: MouseEvent) {
	const target = event.target
	if (
		userMenuOpen.value &&
		target instanceof Node &&
		!userSwitcherRef.value?.contains(target)
	) {
		userMenuOpen.value = false
	}
}

/** 按 Escape 键时收起身份菜单。 */
function closeUserMenuOnEscape(event: KeyboardEvent) {
	if (event.key === 'Escape') userMenuOpen.value = false
}

/** 加载当前身份有权访问的生效文档。 */
async function loadDocuments() {
	if (!activeToken.value) return
	const requestId = ++documentRequestId
	const requestedToken = activeToken.value
	loadingDocuments.value = true
	try {
		const documentList = await getDocuments(requestedToken)
		if (
			requestId === documentRequestId &&
			requestedToken === activeToken.value
		) {
			documents.value = documentList
		}
	} catch (reason) {
		if (requestId === documentRequestId) setError(reason)
	} finally {
		if (requestId === documentRequestId) loadingDocuments.value = false
	}
}

/** 加载当前用户的数据库会话，并恢复上次选择的会话。 */
async function loadConversations() {
	if (!activeToken.value) {
		conversations.value = []
		activeConversationId.value = ''
		conversationTurns.value = []
		return
	}

	const requestId = ++conversationRequestId
	const requestedToken = activeToken.value
	loadingConversations.value = true
	try {
		const conversationList = await getConversations(requestedToken)
		if (
			requestId !== conversationRequestId ||
			requestedToken !== activeToken.value
		)
			return

		conversations.value = conversationList
		const savedId = localStorage.getItem(
			getActiveConversationKey(requestedToken)
		)
		const nextId =
			conversationList.find((conversation) => conversation.id === savedId)?.id ??
			conversationList[0]?.id ??
			''
		activeConversationId.value = nextId
		if (nextId) {
			await loadConversationMessages(nextId)
		} else {
			conversationTurns.value = []
		}
	} catch (reason) {
		if (requestId === conversationRequestId) setError(reason)
	} finally {
		if (requestId === conversationRequestId) loadingConversations.value = false
	}
}

/** 新建数据库会话并切换到空白对话。 */
async function startNewConversation() {
	if (!activeToken.value || creatingConversation.value) return

	creatingConversation.value = true
	error.value = ''
	try {
		const conversation = await createConversation(activeToken.value)
		conversations.value = [
			conversation,
			...conversations.value.filter((item) => item.id !== conversation.id)
		]
		activeConversationId.value = conversation.id
		localStorage.setItem(
			getActiveConversationKey(activeToken.value),
			conversation.id
		)
		conversationTurns.value = []
		await scrollConversationToBottom()
	} catch (reason) {
		setError(reason)
	} finally {
		creatingConversation.value = false
	}
}

/** 切换当前会话并加载数据库中的消息。 */
async function selectConversation(conversation: ConversationSummary) {
	if (!activeToken.value || conversation.id === activeConversationId.value) return

	activeConversationId.value = conversation.id
	localStorage.setItem(
		getActiveConversationKey(activeToken.value),
		conversation.id
	)
	await loadConversationMessages(conversation.id)
	await scrollConversationToBottom()
}

/** 从 MongoDB 读取指定会话的消息。 */
async function loadConversationMessages(conversationId: string) {
	if (!activeToken.value) return

	const requestId = ++conversationMessageRequestId
	const requestedToken = activeToken.value
	try {
		const messages = await getConversationMessages(
			requestedToken,
			conversationId
		)
		if (
			requestId === conversationMessageRequestId &&
			requestedToken === activeToken.value &&
			conversationId === activeConversationId.value
		) {
			conversationTurns.value = messages
		}
	} catch (reason) {
		if (requestId === conversationMessageRequestId) setError(reason)
	}
}

/**
 * 提交企业知识库问题，并维护查询过程中的页面状态。
 *
 * @param prefilledQuestion 点击示例问题时传入的预设文本。
 */
async function ask(prefilledQuestion?: string) {
	const submittedQuestion = (prefilledQuestion ?? question.value).trim()
	if (!submittedQuestion || !activeToken.value || asking.value) return

	if (!activeConversationId.value) {
		await startNewConversation()
	}
	if (!activeConversationId.value) return

	const conversationId = activeConversationId.value
	const turn: ConversationMessage = {
		id: createTurnId(),
		conversationId,
		question: submittedQuestion,
		userName: activeUser.value?.name ?? '用户',
		createdAt: Date.now(),
		status: 'pending'
	}

	conversationTurns.value.push(turn)
	question.value = ''
	asking.value = true
	error.value = ''
	await scrollConversationToBottom()

	try {
		const response = await sendConversationMessage(
			activeToken.value,
			conversationId,
			submittedQuestion
		)
		const index = conversationTurns.value.findIndex(
			(item) => item.id === turn.id
		)
		if (index >= 0) conversationTurns.value[index] = response.message
		upsertConversation(response.conversation)
		if (response.message.status === 'error') {
			setError(response.message.error || '问答处理失败。')
		}
	} catch (reason) {
		turn.status = 'error'
		turn.error = reason instanceof Error ? reason.message : String(reason)
		setError(reason)
	} finally {
		asking.value = false
		await scrollConversationToBottom()
	}
}

/** 更新会话摘要，并把最近使用的会话移动到列表顶部。 */
function upsertConversation(conversation: ConversationSummary) {
	conversations.value = [
		conversation,
		...conversations.value.filter((item) => item.id !== conversation.id)
	]
}

/** 重置表单并打开新建文档弹窗。 */
function openCreate() {
	editingDocument.value = null
	documentTitle.value = ''
	visibility.value = 'company'
	selectedFile.value = null
	saveMessage.value = ''
	showDocumentModal.value = true
}

/** 使用现有 Metadata 填充表单，并打开版本更新弹窗。 */
function openUpdate(document: DocumentSummary) {
	editingDocument.value = document
	documentTitle.value = document.title
	visibility.value = document.visibility
	selectedFile.value = null
	saveMessage.value = ''
	showDocumentModal.value = true
}

/** 保存文件选择器中的第一个 Markdown 文件。 */
function chooseFile(event: Event) {
	selectedFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

/**
 * 提交文档及权限 Metadata。
 * 保存成功后刷新列表；内容未变化时保留弹窗并展示跳过原因。
 */
async function submitDocument() {
	if (!activeUser.value || !selectedFile.value || !documentTitle.value.trim())
		return
	savingDocument.value = true
	saveMessage.value = ''
	try {
		const response = await saveDocument({
			token: activeUser.value.token,
			file: selectedFile.value,
			title: documentTitle.value.trim(),
			visibility: visibility.value,
			documentId: editingDocument.value?.documentId
		})
		saveMessage.value =
			response.status === 'skipped'
				? response.reason || '文档没有变化。'
				: `文档已保存为 v${response.document.version}`
		await loadDocuments()
		// 新建或更新成功后短暂展示版本号，再关闭弹窗。
		if (response.status !== 'skipped') {
			setTimeout(() => (showDocumentModal.value = false), 700)
		}
	} catch (reason) {
		saveMessage.value =
			reason instanceof Error ? reason.message : String(reason)
	} finally {
		savingDocument.value = false
	}
}

/** 删除文档时只关闭生效 Chunk，历史版本仍然留在 Milvus 里用于审计。 */
async function deleteExistingDocument(document: DocumentSummary) {
	if (!activeUser.value || deletingDocumentId.value) return
	const confirmed = window.confirm(
		`确定删除「${document.title}」吗？删除后它不会再被正常检索。`
	)
	if (!confirmed) return

	deletingDocumentId.value = document.documentId
	error.value = ''
	try {
		await deleteDocument(activeUser.value.token, document.documentId)
		await loadDocuments()
	} catch (reason) {
		setError(reason)
	} finally {
		deletingDocumentId.value = ''
	}
}

/** 清空当前用户在数据库中的全部会话与消息。 */
async function clearConversationHistory() {
	if (!activeToken.value || !conversations.value.length) return
	const confirmed = window.confirm('确定清空全部对话记录吗？删除后无法恢复。')
	if (!confirmed) return

	try {
		await clearConversations(activeToken.value)
		conversations.value = []
		activeConversationId.value = ''
		conversationTurns.value = []
		localStorage.removeItem(getActiveConversationKey(activeToken.value))
	} catch (reason) {
		setError(reason)
	}
}

/** 对话增加后自动滚到底部，让最新问答始终可见。 */
async function scrollConversationToBottom() {
	await nextTick()
	const element = conversationRef.value
	if (element) element.scrollTop = element.scrollHeight
}

/** 为当前用户保存最近选择的会话 ID。 */
function getActiveConversationKey(token: string) {
	return `${ACTIVE_CONVERSATION_PREFIX}${token}`
}

/** 生成浏览器端对话记录 ID。 */
function createTurnId() {
	if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 把未知异常转换成页面可以直接展示的错误文本。 */
function setError(reason: unknown) {
	error.value = reason instanceof Error ? reason.message : String(reason)
}

/** 把时间戳格式化成文档列表使用的月日和时间。 */
function formatDate(timestamp: number) {
	return new Intl.DateTimeFormat('zh-CN', {
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	}).format(timestamp)
}
</script>

<template>
	<div class="app-shell">
		<header class="topbar">
			<div class="brand">
				<div class="brand-mark">
					<BookOpenText :size="20" />
				</div>
				<div class="brand-copy">
					<strong>Knowledge Hub</strong>
					<span>企业知识中台</span>
				</div>
			</div>

			<div class="breadcrumb" v-if="activeUser">
				<span>{{ activeUser.departmentName }}</span>
				<i>/</i>
				<strong>知识库工作台</strong>
			</div>

			<div class="topbar-actions">
				<div class="health" :class="{ offline: !serverOnline }">
					<span></span>{{ serverOnline ? '运行中' : '服务离线' }}
				</div>
				<div ref="userSwitcherRef" class="identity-switcher">
					<button
						type="button"
						class="identity-select"
						aria-haspopup="listbox"
						:aria-expanded="userMenuOpen"
						@click="userMenuOpen = !userMenuOpen"
					>
						<div class="identity-avatar">
							{{ activeUser?.name.slice(0, 1) || 'U' }}
						</div>
						<div class="identity-copy">
							<strong>{{ activeUser?.name || '选择身份' }}</strong>
						</div>
						<ChevronDown :size="15" :class="{ open: userMenuOpen }" />
					</button>

					<div v-if="userMenuOpen" class="identity-menu">
						<div class="identity-menu-heading">
							<Users :size="14" />
							<span>切换演示身份</span>
						</div>
						<div role="listbox" aria-label="演示用户">
							<button
								v-for="user in users"
								:key="user.token"
								type="button"
								class="identity-option"
								:class="{ active: user.token === activeToken }"
								role="option"
								:aria-selected="user.token === activeToken"
								@click="changeUser(user)"
							>
								<div class="identity-avatar">{{ user.name.slice(0, 1) }}</div>
								<div class="identity-option-copy">
									<strong>{{ user.name }}</strong>
									<span>{{ user.departmentName }}</span>
								</div>
								<CheckCircle2 v-if="user.token === activeToken" :size="16" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</header>

		<div v-if="error" class="error-banner">
			<CircleAlert :size="17" />
			<span>{{ error }}</span>
			<button aria-label="关闭错误" @click="error = ''">
				<X :size="16" />
			</button>
		</div>

		<nav class="mobile-tabs" aria-label="移动端视图切换">
			<button
				:class="{ active: mobileView === 'query' }"
				@click="mobileView = 'query'"
			>
				<Bot :size="16" />问答
			</button>
			<button
				:class="{ active: mobileView === 'documents' }"
				@click="mobileView = 'documents'"
			>
				<Database :size="16" />文档
			</button>
		</nav>

		<main class="workspace">
			<aside
				class="library-panel"
				:class="{ 'mobile-hidden': mobileView !== 'documents' }"
			>
				<div class="library-heading">
					<div>
						<span class="section-kicker">KNOWLEDGE BASE</span>
						<h1>知识库</h1>
					</div>
					<div class="heading-actions">
						<button class="icon-button" title="刷新文档" @click="loadDocuments">
							<RefreshCw :size="16" :class="{ spinning: loadingDocuments }" />
						</button>
						<button
							v-if="isAdmin"
							class="primary-button compact"
							@click="openCreate"
						>
							<FilePlus2 :size="16" />新建
						</button>
					</div>
				</div>

				<div class="library-stats">
					<div>
						<strong>{{ documents.length }}</strong
						><span>可访问</span>
					</div>
				</div>

				<div v-if="loadingDocuments" class="panel-loading">
					<LoaderCircle :size="22" class="spinning" />
				</div>
				<div v-else-if="filteredDocuments.length === 0" class="empty-library">
					<FileText :size="25" />
					<span>暂无匹配文档</span>
				</div>
				<div v-else class="document-list">
					<article
						v-for="document in filteredDocuments"
						:key="document.documentId"
						class="document-row"
						:class="{ 'has-actions': isAdmin }"
					>
						<div class="document-icon">
							<Globe2 v-if="document.visibility === 'company'" :size="17" />
							<LockKeyhole v-else :size="17" />
						</div>
						<div class="document-info">
							<h2>{{ document.title }}</h2>
							<div class="document-meta">
								<span>v{{ document.version }}</span>
								<span>{{ document.chunkCount }} chunks</span>
							</div>
							<time>
								<Clock3 :size="12" />{{ formatDate(document.updatedAt) }}
							</time>
						</div>
						<div v-if="isAdmin" class="row-actions">
							<button
								class="icon-button row-action"
								title="发布新版本"
								@click="openUpdate(document)"
							>
								<Upload :size="15" />
							</button>
							<button
								class="icon-button row-action danger"
								title="删除文档"
								:disabled="deletingDocumentId === document.documentId"
								@click="deleteExistingDocument(document)"
							>
								<LoaderCircle
									v-if="deletingDocumentId === document.documentId"
									:size="15"
									class="spinning"
								/>
								<Trash2 v-else :size="15" />
							</button>
						</div>
					</article>
				</div>
			</aside>

			<section
				class="query-panel"
				:class="{ 'mobile-hidden': mobileView !== 'query' }"
			>
				<div class="query-heading">
					<div>
						<span class="section-kicker">AI RETRIEVAL</span>
						<h1>知识问答</h1>
					</div>
						<div class="query-heading-actions">
							<div class="pipeline-labels">
							<span> <Layers3 :size="14" />Hybrid Search </span>
							<span> <Sparkles :size="14" />Rerank </span>
							<span>
								<Clock3 :size="14" />{{ conversationTurns.length }} 条记录
							</span>
							<span>
								<ShieldCheck :size="14" />{{
									isAdmin ? '企业管理员权限' : '教师对话权限'
								}}
							</span>
						</div>
						<button
							class="primary-button compact new-conversation-button"
							:disabled="creatingConversation"
							@click="startNewConversation"
						>
							<LoaderCircle
								v-if="creatingConversation"
								:size="15"
								class="spinning"
							/>
							<Plus v-else :size="15" />
							新建对话
						</button>
						<button
							v-if="conversations.length"
							class="icon-button"
							title="清空全部对话"
							@click="clearConversationHistory"
						>
							<Trash2 :size="15" />
						</button>
					</div>
				</div>

				<div
					v-if="loadingConversations || conversations.length"
					class="conversation-tabs"
					aria-label="历史会话"
				>
					<div v-if="loadingConversations" class="conversation-tabs-loading">
						<LoaderCircle :size="14" class="spinning" />
						<span>正在加载会话</span>
					</div>
					<button
						v-for="conversation in conversations"
						:key="conversation.id"
						type="button"
						class="conversation-tab"
						:class="{ active: conversation.id === activeConversationId }"
						:title="conversation.title"
						@click="selectConversation(conversation)"
					>
						<MessageSquareText :size="14" />
						<span>
							<strong>{{ conversation.title }}</strong>
							<small>{{ conversation.messageCount }} 条对话</small>
						</span>
					</button>
				</div>

				<div ref="conversationRef" class="conversation">
					<div v-if="conversationTurns.length === 0" class="query-empty">
						<div class="empty-symbol">
							<Bot :size="27" />
						</div>
						<h2>从企业知识中查找答案</h2>
						<div class="suggestion-list">
							<button
								v-for="item in suggestions"
								:key="item"
								@click="ask(item)"
							>
								<span>{{ item }}</span>
								<SendHorizontal :size="14" />
							</button>
						</div>
					</div>

					<template v-for="turn in conversationTurns" :key="turn.id">
						<div class="user-question">
							<div class="message-avatar user">
								{{ turn.userName.slice(0, 1) }}
							</div>
							<div>
								<span
									>{{ turn.userName }} · {{ formatDate(turn.createdAt) }}</span
								>
								<p>{{ turn.question }}</p>
							</div>
						</div>

						<div
							v-if="turn.status === 'pending'"
							class="assistant-response loading-response"
						>
							<div class="message-avatar assistant">
								<Bot :size="17" />
							</div>
							<div>
								<span>知识库助手</span>
								<p>
									<LoaderCircle
										:size="16"
										class="spinning"
									/>正在检索并核对企业知识
								</p>
							</div>
						</div>

						<div
							v-else-if="turn.status === 'error'"
							class="assistant-response result-response error-response"
						>
							<div class="message-avatar assistant">
								<CircleAlert :size="17" />
							</div>
							<div class="response-content">
								<div class="message-heading">
									<div><strong>知识库助手</strong><span>调用失败</span></div>
								</div>
								<div class="answer-copy">{{ turn.error }}</div>
							</div>
						</div>

						<div
							v-else-if="turn.result"
							class="assistant-response result-response"
						>
							<div class="message-avatar assistant">
								<Bot :size="17" />
							</div>
							<div class="response-content">
								<div class="message-heading">
									<div>
										<strong>知识库助手</strong
										><span>{{ turn.result.pipeline.latencyMs }} ms</span>
									</div>
									<div class="answer-status" :class="turn.result.status">
										<CheckCircle2
											v-if="turn.result.status === 'answered'"
											:size="15"
										/>
										<CircleAlert v-else :size="15" />
										{{
											turn.result.status === 'answered'
												? '依据充分'
												: '依据不足'
										}}
									</div>
								</div>

								<div class="answer-copy">{{ turn.result.answer }}</div>

								<section
									v-if="turn.result.sources.length"
									class="sources-section"
								>
									<div class="subsection-heading">
										<strong>引用来源</strong
										><span>{{ turn.result.sources.length }}</span>
									</div>
									<article
										v-for="source in turn.result.sources"
										:key="source.chunkId"
										class="source-row"
									>
										<div class="source-index">{{ source.chunkIndex + 1 }}</div>
										<div>
											<div class="source-title">
												<strong>{{ source.title }}</strong>
												<span
													>v{{ source.version }} · Chunk
													{{ source.chunkIndex + 1 }}</span
												>
											</div>
											<p>{{ source.content }}</p>
											<code>{{ source.chunkId }}</code>
										</div>
									</article>
								</section>

								<details class="pipeline-details">
									<summary>
										<span> <Database :size="14" />检索链路 </span>
										<b
											>{{ turn.result.pipeline.recalledCount }} 召回 ·
											{{ turn.result.pipeline.rerankedCount }} 精排</b
										>
									</summary>
									<div class="filter-code">
										{{ turn.result.pipeline.permissionFilter }}
									</div>
									<div
										v-for="candidate in turn.result.pipeline.candidates"
										:key="candidate.chunkId"
										class="candidate-row"
									>
										<div>
											<span>#{{ candidate.rank }}</span
											><strong>{{ candidate.title }}</strong>
										</div>
										<b>{{ candidate.rerankScore.toFixed(4) }}</b>
									</div>
								</details>
							</div>
						</div>
					</template>
				</div>

				<div class="composer-wrap">
					<form class="composer" @submit.prevent="ask()">
						<textarea
							v-model="question"
							rows="2"
							maxlength="1000"
							placeholder="输入需要查询的企业知识问题"
						></textarea>
						<div class="composer-footer">
							<span>{{ question.length }} / 1000</span>
							<button
								class="send-button"
								:disabled="asking || !question.trim()"
								aria-label="发送问题"
							>
								<LoaderCircle v-if="asking" :size="17" class="spinning" />
								<SendHorizontal v-else :size="17" />
							</button>
						</div>
					</form>
				</div>
			</section>
		</main>

		<div
			v-if="showDocumentModal"
			class="modal-backdrop"
			@click.self="showDocumentModal = false"
		>
			<form class="modal" @submit.prevent="submitDocument">
				<div class="modal-heading">
					<div>
						<span class="section-kicker">DOCUMENT VERSION</span>
						<h2>{{ editingDocument ? '发布文档新版本' : '新建知识文档' }}</h2>
					</div>
					<button
						type="button"
						class="icon-button"
						aria-label="关闭"
						@click="showDocumentModal = false"
					>
						<X :size="18" />
					</button>
				</div>

				<div class="form-grid">
					<label class="wide"
						>文档标题<input v-model="documentTitle" required maxlength="120"
					/></label>
				</div>

				<label class="file-picker">
					<div>
						<Upload :size="20" />
					</div>
					<span>{{ selectedFile?.name || '选择 Markdown 文档' }}</span>
					<small>支持 .md，单个文件不超过 2 MB</small>
					<input
						type="file"
						accept=".md,text/markdown"
						required
						@change="chooseFile"
					/>
				</label>

				<p v-if="saveMessage" class="save-message">{{ saveMessage }}</p>
				<div class="modal-actions">
					<button
						type="button"
						class="secondary-button"
						@click="showDocumentModal = false"
					>
						取消
					</button>
					<button
						class="primary-button"
						:disabled="savingDocument || !selectedFile"
					>
						<LoaderCircle v-if="savingDocument" :size="17" class="spinning" />
						<Upload v-else :size="17" />保存文档
					</button>
				</div>
			</form>
		</div>
	</div>
</template>
