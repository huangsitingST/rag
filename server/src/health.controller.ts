import { Controller, Get } from '@nestjs/common'
import { MongodbService } from './mongodb/mongodb.service.js'

@Controller('health')
export class HealthController {
	constructor(private readonly mongodb: MongodbService) {}

	/** 返回前端和运行检查使用的服务存活状态。 */
	@Get()
	async check() {
		return {
			status: 'ok',
			service: 'enterprise-knowledge-base',
			database: await this.mongodb.ping(),
			timestamp: new Date().toISOString()
		}
	}
}
