import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(Role.GURU)
  create(@Body() dto: CreateAssignmentDto, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.create(user.id, dto);
  }

  @Get('teacher')
  @Roles(Role.GURU)
  findAllForTeacher(@CurrentUser() user: AuthUser) {
    return this.assignmentsService.findAllForTeacher(user.id);
  }

  @Get('student')
  @Roles(Role.MURID)
  findAllForStudent(@CurrentUser() user: AuthUser) {
    return this.assignmentsService.findAllForStudent(user.id);
  }

  @Get(':id/take')
  @Roles(Role.MURID)
  take(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.findOneForTake(id, user.id);
  }

  @Post(':id/submit')
  @Roles(Role.MURID)
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assignmentsService.submit(id, user.id, dto);
  }

  @Get(':id/review')
  @Roles(Role.MURID)
  review(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.getReview(id, user.id);
  }

  @Patch(':id/publish')
  @Roles(Role.GURU)
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assignmentsService.publish(user.id, id);
  }

  @Get(':id/export')
  @Roles(Role.GURU)
  async exportRecap(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.assignmentsService.exportRecap(
      user.id,
      id,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
