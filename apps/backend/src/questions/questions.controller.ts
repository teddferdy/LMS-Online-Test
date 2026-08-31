import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { BulkCreateQuestionDto } from './dto/bulk-create-question.dto';
import { BulkUpdateQuestionDto } from './dto/bulk-update-question.dto';
import { QuestionsService } from './questions.service';

@Controller('questions')
@Roles(Role.GURU)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Post()
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthUser) {
    return this.questionsService.create(user.id, dto);
  }

  @Post('bulk')
  createMany(
    @Body() dto: BulkCreateQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.questionsService.createMany(user.id, dto.questions);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.questionsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.questionsService.findOne(user.id, id);
  }

  @Put('bulk')
  updateMany(
    @Body() dto: BulkUpdateQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.questionsService.updateMany(
      user.id,
      dto.questions.map((item) => ({
        id: item.id,
        dto: item,
      })),
    );
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.questionsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.questionsService.remove(user.id, id);
  }
}
