import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { QuestionsService } from './questions.service';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let prisma: {
    question: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const teacherId = 'guru-1';

  beforeEach(() => {
    prisma = {
      question: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new QuestionsService(prisma as never);
  });

  describe('create', () => {
    it('menormalkan kunci jawaban huruf kecil menjadi huruf besar', async () => {
      prisma.question.create.mockImplementation(async (args) => args.data);

      await service.create(teacherId, {
        questionText: '2 + 2 = ?',
        type: QuestionType.MULTIPLE_CHOICE,
        options: ['3', '4', '5'],
        correctAnswer: 'b',
      });

      expect(prisma.question.create.mock.calls[0][0].data.correctAnswer).toBe(
        'B',
      );
    });

    it('mengonversi teks opsi lengkap menjadi huruf kunci', async () => {
      prisma.question.create.mockImplementation(async (args) => args.data);

      await service.create(teacherId, {
        questionText: 'Ibu kota Indonesia?',
        options: ['A. Jakarta', 'B. Bandung'],
        correctAnswer: 'A. Jakarta',
      });

      expect(prisma.question.create.mock.calls[0][0].data.correctAnswer).toBe(
        'A',
      );
    });

    it('melempar BadRequestException saat soal PG tanpa opsi', async () => {
      await expect(
        service.create(teacherId, {
          questionText: 'Soal tanpa opsi',
          correctAnswer: 'A',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('melempar BadRequestException saat kunci di luar jumlah opsi', async () => {
      await expect(
        service.create(teacherId, {
          questionText: 'Soal',
          options: ['Satu', 'Dua'],
          correctAnswer: 'E',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('melempar BadRequestException saat kunci tidak cocok dengan opsi mana pun', async () => {
      await expect(
        service.create(teacherId, {
          questionText: 'Soal',
          options: ['Satu', 'Dua'],
          correctAnswer: 'Tiga',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('menyimpan soal essay dengan kunci jawaban bebas', async () => {
      prisma.question.create.mockImplementation(async (args) => args.data);

      await service.create(teacherId, {
        questionText: 'Sebutkan ibu kota Indonesia!',
        type: QuestionType.ESSAY,
        correctAnswer: '  Jakarta  ',
      });

      const data = prisma.question.create.mock.calls[0][0].data;
      expect(data.correctAnswer).toBe('Jakarta');
      expect(data.type).toBe(QuestionType.ESSAY);
    });
  });

  describe('update', () => {
    const existingQuestion = {
      id: 'q-1',
      teacherId,
      type: QuestionType.MULTIPLE_CHOICE,
      questionText: 'Lama',
      imageUrl: null,
      options: ['Satu', 'Dua'],
      correctAnswer: 'A',
      explanation: null,
      explanationImg: null,
      createdAt: new Date(),
    };

    it('memperbarui soal milik guru sendiri', async () => {
      prisma.question.findUnique.mockResolvedValue(existingQuestion);
      prisma.question.update.mockImplementation(async (args) => ({
        ...existingQuestion,
        ...args.data,
      }));

      const result = await service.update(teacherId, 'q-1', {
        questionText: 'Baru',
      });

      expect(result.questionText).toBe('Baru');
      expect(result.correctAnswer).toBe('A');
    });

    it('melempar NotFoundException saat soal milik guru lain', async () => {
      prisma.question.findUnique.mockResolvedValue({
        ...existingQuestion,
        teacherId: 'guru-lain',
      });

      await expect(
        service.update(teacherId, 'q-1', { questionText: 'Baru' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('melempar NotFoundException saat soal tidak ada', async () => {
      prisma.question.findUnique.mockResolvedValue(null);

      await expect(service.remove(teacherId, 'q-404')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
