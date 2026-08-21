import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Assignment, Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { gradeAssignment } from './grading';

const ASSIGNMENT_INCLUDE = {
  teacher: { select: { id: true, name: true, email: true } },
  student: { select: { id: true, name: true, email: true } },
  submissions: true,
} satisfies Prisma.AssignmentInclude;

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async create(teacherId: string, dto: CreateAssignmentDto) {
    const questionIds = [...new Set(dto.questionIds)];
    const studentIds = [...new Set(dto.studentIds)];

    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, teacherId },
      select: { id: true },
    });
    if (questions.length !== questionIds.length) {
      throw new BadRequestException(
        'Beberapa soal tidak ditemukan atau bukan milik Anda',
      );
    }

    const students = await this.prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, role: true },
    });
    if (students.length !== studentIds.length) {
      throw new BadRequestException('Beberapa murid tidak ditemukan');
    }
    const nonStudents = students.filter((student) => student.role !== 'MURID');
    if (nonStudents.length > 0) {
      throw new BadRequestException(
        'Penugasan hanya dapat diberikan kepada pengguna dengan role MURID',
      );
    }

    const dueDate = new Date(dto.dueDate);
    const created = await this.prisma.$transaction(
      studentIds.map((studentId) =>
        this.prisma.assignment.create({
          data: {
            title: dto.title,
            questionIds: questionIds,
            teacherId,
            studentId,
            durationMin: dto.durationMin ?? 60,
            isPublished: dto.isPublished ?? false,
            dueDate,
          },
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        }),
      ),
    );

    return {
      message: `Tugas berhasil ditugaskan ke ${created.length} murid`,
      totalAssigned: created.length,
      assignments: created,
    };
  }

  async findAllForTeacher(teacherId: string) {
    return this.prisma.assignment.findMany({
      where: { teacherId },
      include: ASSIGNMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForStudent(studentId: string) {
    return this.prisma.assignment.findMany({
      where: { studentId, isPublished: true },
      include: {
        teacher: { select: { id: true, name: true } },
        submissions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForTake(assignmentId: string, studentId: string) {
    const assignment = await this.getPublishedAssignmentForStudent(
      assignmentId,
      studentId,
    );

    const questions = await this.getOrderedQuestions(assignment);

    return {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        durationMin: assignment.durationMin,
        dueDate: assignment.dueDate,
        serverTime: new Date().toISOString(),
      },
      questions: questions.map((question) => ({
        id: question.id,
        type: question.type,
        questionText: question.questionText,
        imageUrl: question.imageUrl,
        options:
          question.type === 'MULTIPLE_CHOICE'
            ? (question.options as string[] | null)
            : null,
      })),
    };
  }

  async submit(
    assignmentId: string,
    studentId: string,
    dto: SubmitAssignmentDto,
  ) {
    const assignment = await this.getPublishedAssignmentForStudent(
      assignmentId,
      studentId,
    );

    const existingSubmission = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (existingSubmission) {
      throw new ConflictException(
        'Anda sudah mengumpulkan jawaban untuk tugas ini',
      );
    }

    const questions = await this.getOrderedQuestions(assignment);
    const result = gradeAssignment(questions, dto.answers ?? {});

    const submission = await this.prisma.submission.create({
      data: {
        assignmentId,
        studentId,
        answers: dto.answers,
        score: result.score,
        status: result.status,
        isTimeout: dto.isTimeout ?? false,
        review: result.review as unknown as Prisma.InputJsonValue,
      },
    });

    const correctCount = result.review.filter((item) => item.isCorrect).length;

    return {
      message: 'Tugas berhasil dikumpulkan',
      submissionId: submission.id,
      score: result.score,
      status: result.status,
      summary: {
        totalQuestions: questions.length,
        correct: correctCount,
        wrong: questions.length - correctCount,
      },
      review: result.review,
    };
  }

  async getReview(assignmentId: string, studentId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: {
        assignment: { select: { id: true, title: true } },
      },
    });
    if (!submission) {
      throw new NotFoundException(
        'Belum ada pengumpulan jawaban untuk tugas ini',
      );
    }

    return {
      assignment: submission.assignment,
      score: submission.score,
      status: submission.status,
      isTimeout: submission.isTimeout,
      submittedAt: submission.submittedAt,
      answers: submission.answers,
      review: submission.review,
    };
  }

  async publish(teacherId: string, assignmentId: string) {
    const assignment = await this.getOwnedAssignment(assignmentId, teacherId);
    if (assignment.isPublished) {
      return { message: 'Tugas sudah dipublikasikan sebelumnya', assignment };
    }

    const updated = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { isPublished: true },
      include: ASSIGNMENT_INCLUDE,
    });

    return { message: 'Tugas berhasil dipublikasikan', assignment: updated };
  }

  async exportRecap(
    teacherId: string,
    assignmentId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const assignment = await this.getOwnedAssignment(assignmentId, teacherId);

    const siblings = await this.prisma.assignment.findMany({
      where: { teacherId, title: assignment.title },
      include: {
        student: { select: { name: true, email: true } },
        submissions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMS Tempat Les';
    const sheet = workbook.addWorksheet('Rekap Nilai');

    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Murid', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Judul Tugas', key: 'title', width: 36 },
      { header: 'Nilai', key: 'score', width: 10 },
      { header: 'Status Penilaian', key: 'gradingStatus', width: 18 },
      { header: 'Submit karena Waktu Habis', key: 'isTimeout', width: 26 },
      { header: 'Waktu Submit', key: 'submittedAt', width: 24 },
    ];

    for (const sibling of siblings) {
      const submission = sibling.submissions[0];
      sheet.addRow({
        no: sheet.rowCount,
        name: sibling.student.name,
        email: sibling.student.email,
        title: sibling.title,
        score: submission ? submission.score : '-',
        gradingStatus: submission ? submission.status : 'BELUM_MENGERJAKAN',
        isTimeout: submission ? (submission.isTimeout ? 'Ya' : 'Tidak') : '-',
        submittedAt: submission ? submission.submittedAt.toISOString() : '-',
      });
    }

    sheet.getRow(1).font = { bold: true };

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const filename = `rekap-nilai-${slugify(assignment.title)}.xlsx`;

    return { buffer, filename };
  }

  private async getOwnedAssignment(
    assignmentId: string,
    teacherId: string,
  ): Promise<Assignment> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.teacherId !== teacherId) {
      throw new NotFoundException('Tugas tidak ditemukan');
    }
    return assignment;
  }

  private async getPublishedAssignmentForStudent(
    assignmentId: string,
    studentId: string,
  ): Promise<Assignment> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.studentId !== studentId) {
      throw new NotFoundException('Tugas tidak ditemukan');
    }
    if (!assignment.isPublished) {
      throw new ForbiddenException('Tugas ini belum dipublikasikan');
    }
    return assignment;
  }

  private async getOrderedQuestions(assignment: Assignment) {
    const questionIds = (assignment.questionIds as string[]) ?? [];
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
    });
    const questionMap = new Map(
      questions.map((question) => [question.id, question]),
    );
    return questionIds
      .map((id) => questionMap.get(id))
      .filter((question): question is NonNullable<typeof question> =>
        Boolean(question),
      );
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
