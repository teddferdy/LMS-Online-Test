import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { UpdateQuestionItemDto } from './update-question-item.dto';

export class BulkUpdateQuestionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionItemDto)
  questions: UpdateQuestionItemDto[];
}
