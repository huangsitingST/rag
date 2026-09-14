import {
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength
} from 'class-validator'

export class CreateConversationDto {
	@IsOptional()
	@IsString()
	@MaxLength(120)
	title?: string
}

export class SendConversationMessageDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	question: string
}
