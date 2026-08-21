import { GradingStatus, QuestionType } from '@prisma/client';
import { gradeAssignment, GradableQuestion } from './grading';

function mcQuestion(
  overrides: Partial<GradableQuestion> = {},
): GradableQuestion {
  return {
    id: 'q-1',
    type: QuestionType.MULTIPLE_CHOICE,
    questionText: 'Ibu kota Indonesia adalah...',
    correctAnswer: 'B',
    explanation: 'Pembahasan: Jawabannya B',
    ...overrides,
  };
}

function essayQuestion(
  overrides: Partial<GradableQuestion> = {},
): GradableQuestion {
  return {
    id: 'q-2',
    type: QuestionType.ESSAY,
    questionText: 'Sebutkan ibu kota Indonesia!',
    correctAnswer: 'Jakarta',
    explanation: null,
    ...overrides,
  };
}

describe('gradeAssignment', () => {
  describe('multiple choice', () => {
    it('memberi nilai penuh saat semua jawaban PG benar', () => {
      const questions = [mcQuestion(), mcQuestion({ id: 'q-3' })];
      const result = gradeAssignment(questions, { 'q-1': 'B', 'q-3': 'b' });

      expect(result.score).toBe(100);
      expect(result.status).toBe(GradingStatus.AUTO_GRADED);
      expect(result.review.every((item) => item.isCorrect)).toBe(true);
    });

    it('menandai salah saat jawaban PG berbeda (case-insensitive)', () => {
      const result = gradeAssignment([mcQuestion()], { 'q-1': 'a' });

      expect(result.score).toBe(0);
      expect(result.review[0].isCorrect).toBe(false);
      expect(result.review[0].studentAnswer).toBe('a');
    });

    it('mengembalikan kunci jawaban dan pembahasan pada review', () => {
      const result = gradeAssignment([mcQuestion()], { 'q-1': 'A' });

      expect(result.review[0]).toMatchObject({
        questionId: 'q-1',
        questionType: QuestionType.MULTIPLE_CHOICE,
        correctAnswer: 'B',
        isCorrect: false,
        explanation: 'Pembahasan: Jawabannya B',
      });
    });
  });

  describe('essay', () => {
    it('menilai benar dengan pencocokan case-insensitive dan spasi berlebih', () => {
      const result = gradeAssignment([essayQuestion()], {
        'q-2': '  JAKARTA   ',
      });

      expect(result.score).toBe(100);
      expect(result.status).toBe(GradingStatus.AUTO_GRADED);
      expect(result.review[0].isCorrect).toBe(true);
    });

    it('menandai salah untuk jawaban singkat yang tidak cocok tanpa manual review', () => {
      const result = gradeAssignment([essayQuestion()], { 'q-2': 'Bandung' });

      expect(result.score).toBe(0);
      expect(result.status).toBe(GradingStatus.AUTO_GRADED);
      expect(result.review[0].isCorrect).toBe(false);
    });

    it('menandai NEEDS_REVIEW untuk jawaban panjang yang tidak cocok', () => {
      const longWrongAnswer =
        'Ibu kota Indonesia sebelumnya adalah Jakarta namun sekarang sudah dipindahkan ke Nusantara';
      const result = gradeAssignment([essayQuestion()], {
        'q-2': longWrongAnswer,
      });

      expect(result.score).toBe(0);
      expect(result.status).toBe(GradingStatus.NEEDS_REVIEW);
      expect(result.review[0].isCorrect).toBe(false);
    });
  });

  describe('kalkulasi skor', () => {
    it('membulatkan skor ke dua desimal (2 dari 3 benar = 66.67)', () => {
      const questions = [
        mcQuestion(),
        mcQuestion({ id: 'q-2' }),
        essayQuestion({ id: 'q-3' }),
      ];
      const result = gradeAssignment(questions, {
        'q-1': 'B',
        'q-2': 'B',
        'q-3': 'salah sekali',
      });

      expect(result.score).toBe(66.67);
    });

    it('memberi skor 0 saat tidak ada jawaban yang dikirim', () => {
      const questions = [mcQuestion(), essayQuestion()];
      const result = gradeAssignment(questions, {});

      expect(result.score).toBe(0);
      expect(result.review.every((item) => item.studentAnswer === null)).toBe(
        true,
      );
    });

    it('menangani daftar soal kosong tanpa error', () => {
      const result = gradeAssignment([], {});

      expect(result.score).toBe(0);
      expect(result.review).toEqual([]);
      expect(result.status).toBe(GradingStatus.AUTO_GRADED);
    });

    it('mengabaikan jawaban kosong/whitespace sebagai null', () => {
      const result = gradeAssignment([mcQuestion()], { 'q-1': '   ' });

      expect(result.review[0].studentAnswer).toBeNull();
      expect(result.score).toBe(0);
    });
  });
});
