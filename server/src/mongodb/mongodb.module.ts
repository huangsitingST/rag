import { Global, Module } from '@nestjs/common'
import { MongodbService } from './mongodb.service.js'

@Global()
@Module({
	providers: [MongodbService],
	exports: [MongodbService]
})
export class MongodbModule {}
