import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  questionIds: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  studentIds: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
