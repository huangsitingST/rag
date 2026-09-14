import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class SaveDocumentDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	title: string

	@IsIn(['company', 'department'])
	visibility: 'company' | 'department'
}
