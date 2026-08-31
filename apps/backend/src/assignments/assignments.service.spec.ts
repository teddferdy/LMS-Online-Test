import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GradingStatus, QuestionType, Role } from '@prisma/client';
import { AssignmentsService } from './assignments.service';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  const teacherId = 'guru-1';
  const studentId = 'murid-1';

  const mcQuestion = {
    id: 'q-1',
    teacherId,
    type: QuestionType.MULTIPLE_CHOICE,
    questionText: '2 + 2 = ?',
    imageUrl: null,
    options: ['3', '4'],
    correctAnswer: 'B',
    explanation: 'Karena 2+2=4',
    explanationImg: null,
    createdAt: new Date(),
  };

  const assignment = {
    id: 'asg-1',
    title: 'Ujian Matematika',
    questionIds: ['q-1'],
    teacherId,
    studentId,
    durationMin: 60,
    isPublished: true,
    dueDate: new Date('2026-12-31'),
    createdAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      question: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      assignment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      submission: { findUnique: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new AssignmentsService(prisma as never);
  });

  describe('create', () => {
    const dto = {
      title: 'Ujian Matematika',
      questionIds: ['q-1'],
      studentIds: [studentId],
      dueDate: '2026-12-31T00:00:00.000Z',
    };

    it('melempar BadRequestException saat soal bukan milik guru', async () => {
      prisma.question.findMany.mockResolvedValue([]);

      await expect(service.create(teacherId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('melempar BadRequestException saat target bukan role MURID', async () => {
      prisma.question.findMany.mockResolvedValue([{ id: 'q-1' }]);
      prisma.user.findMany.mockResolvedValue([
        { id: studentId, role: Role.GURU },
      ]);

      await expect(service.create(teacherId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('membuat satu tugas per murid di dalam transaksi', async () => {
      prisma.question.findMany.mockResolvedValue([{ id: 'q-1' }]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'murid-1', role: Role.MURID },
        { id: 'murid-2', role: Role.MURID },
      ]);
      prisma.assignment.create.mockImplementation(async (args) => ({
        id: 'asg-baru',
        ...args.data,
      }));
      prisma.$transaction.mockImplementation(async (operations) =>
        Promise.all(operations),
      );

      const result = await service.create(teacherId, {
        ...dto,
        studentIds: ['murid-1', 'murid-2'],
      });

      expect(result.totalAssigned).toBe(2);
      expect(prisma.assignment.create).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOneForTake', () => {
    it('menyembunyikan kunci jawaban dan pembahasan dari murid', async () => {
      prisma.assignment.findUnique.mockResolvedValue(assignment);
      prisma.question.findMany.mockResolvedValue([mcQuestion]);

      const result = await service.findOneForTake('asg-1', studentId);

      expect(result.questions[0]).not.toHaveProperty('correctAnswer');
      expect(result.questions[0]).not.toHaveProperty('explanation');
      expect(result.assignment.durationMin).toBe(60);
    });

    it('melempar ForbiddenException saat tugas belum dipublikasikan', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...assignment,
        isPublished: false,
      });

      await expect(service.findOneForTake('asg-1', studentId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('melempar NotFoundException saat murid bukan penerima tugas', async () => {
      prisma.assignment.findUnique.mockResolvedValue(assignment);

      await expect(
        service.findOneForTake('asg-1', 'murid-lain'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submit', () => {
    it('menilai otomatis dan menyimpan submission', async () => {
      prisma.assignment.findUnique.mockResolvedValue(assignment);
      prisma.submission.findUnique.mockResolvedValue(null);
      prisma.question.findMany.mockResolvedValue([mcQuestion]);
      prisma.submission.create.mockImplementation(async (args) => ({
        id: 'sub-1',
        ...args.data,
      }));

      const result = await service.submit('asg-1', studentId, {
        answers: { 'q-1': 'B' },
      });

      expect(result.score).toBe(100);
      expect(result.status).toBe(GradingStatus.AUTO_GRADED);
      expect(result.summary).toEqual({
        totalQuestions: 1,
        correct: 1,
        wrong: 0,
      });
      expect(prisma.submission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignmentId: 'asg-1',
            studentId,
            score: 100,
          }),
        }),
      );
    });

    it('melempar ConflictException saat murid sudah pernah submit', async () => {
      prisma.assignment.findUnique.mockResolvedValue(assignment);
      prisma.submission.findUnique.mockResolvedValue({ id: 'sub-lama' });

      await expect(
        service.submit('asg-1', studentId, { answers: {} }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getReview', () => {
    it('mengembalikan review lengkap setelah submit', async () => {
      prisma.submission.findUnique.mockResolvedValue({
        id: 'sub-1',
        assignmentId: 'asg-1',
        studentId,
        score: 100,
        status: GradingStatus.AUTO_GRADED,
        isTimeout: false,
        submittedAt: new Date(),
        answers: { 'q-1': 'B' },
        review: [],
        assignment: { id: 'asg-1', title: 'Ujian Matematika' },
      });

      const result = await service.getReview('asg-1', studentId);

      expect(result.score).toBe(100);
      expect(result.assignment.title).toBe('Ujian Matematika');
    });

    it('melempar NotFoundException saat belum ada submission', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);

      await expect(service.getReview('asg-1', studentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('publish', () => {
    it('memublikasikan tugas milik guru', async () => {
      prisma.assignment.findUnique.mockResolvedValue({
        ...assignment,
        isPublished: false,
      });
      prisma.assignment.update.mockResolvedValue({
        ...assignment,
        isPublished: true,
      });

      const result = await service.publish(teacherId, 'asg-1');

      expect(result.message).toBe('Tugas berhasil dipublikasikan');
      expect(result.assignment.isPublished).toBe(true);
    });

    it('melempar NotFoundException saat tugas milik guru lain', async () => {
      prisma.assignment.findUnique.mockResolvedValue(assignment);

      await expect(service.publish('guru-lain', 'asg-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
