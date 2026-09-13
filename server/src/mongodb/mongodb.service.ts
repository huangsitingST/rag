import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Collection, Db, Document, MongoClient } from 'mongodb'

@Injectable()
export class MongodbService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(MongodbService.name)
	private client: MongoClient | null = null
	private database: Db | null = null

	constructor(private readonly config: ConfigService) {}

	/** 应用启动时连接 MongoDB，并通过 ping 确认连接真实可用。 */
	async onModuleInit() {
		const uri = this.config.getOrThrow<string>('MONGODB_URI')
		const databaseName = this.config.get<string>('MONGODB_DATABASE', 'rag')
		const serverSelectionTimeoutMS = Number(
			this.config.get<string>(
				'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
				'5000'
			)
		)
		const client = new MongoClient(uri, { serverSelectionTimeoutMS })

		try {
			await client.connect()
			const database = client.db(databaseName)
			await database.command({ ping: 1 })

			this.client = client
			this.database = database
			this.logger.log(`MongoDB connected: ${databaseName}`)
		} catch (error) {
			await client.close().catch(() => undefined)
			throw error
		}
	}

	/** 应用关闭时释放连接池。 */
	async onModuleDestroy() {
		await this.client?.close()
		this.client = null
		this.database = null
	}

	/** 返回已连接的数据库实例，供业务模块直接访问集合。 */
	getDb(): Db {
		if (!this.database) {
			throw new Error('MongoDB 尚未初始化。')
		}

		return this.database
	}

	/** 获取指定集合，业务模块无需重复管理 MongoClient。 */
	getCollection<T extends Document = Document>(name: string): Collection<T> {
		return this.getDb().collection<T>(name)
	}

	/** 执行轻量健康检查，并返回当前连接延迟。 */
	async ping() {
		const startedAt = performance.now()
		await this.getDb().command({ ping: 1 })

		return {
			status: 'connected',
			database: this.getDb().databaseName,
			latencyMs: Math.round(performance.now() - startedAt)
		}
	}
}
