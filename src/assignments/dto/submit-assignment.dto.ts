import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class SubmitAssignmentDto {
  @IsObject()
  answers: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isTimeout?: boolean;
}
