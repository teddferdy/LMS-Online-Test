import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Question, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(teacherId: string, dto: CreateQuestionDto): Promise<Question> {
    const type = dto.type ?? QuestionType.MULTIPLE_CHOICE;
    const correctAnswer = this.resolveCorrectAnswer(
      type,
      dto.options,
      dto.correctAnswer,
    );

    return this.prisma.question.create({
      data: {
        teacherId,
        type,
        questionText: dto.questionText,
        imageUrl: dto.imageUrl,
        options:
          type === QuestionType.MULTIPLE_CHOICE
            ? (dto.options as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        correctAnswer,
        explanation: dto.explanation,
        explanationImg: dto.explanationImg,
      },
    });
  }

  async findAll(teacherId: string): Promise<Question[]> {
    return this.prisma.question.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    teacherId: string,
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<Question> {
    const existing = await this.findOwnedQuestion(teacherId, id);

    const type = dto.type ?? existing.type;
    const options =
      dto.options !== undefined
        ? dto.options
        : ((existing.options as string[] | null) ?? null);
    const rawCorrectAnswer = dto.correctAnswer ?? existing.correctAnswer;
    const correctAnswer = this.resolveCorrectAnswer(
      type,
      options,
      rawCorrectAnswer,
    );

    return this.prisma.question.update({
      where: { id },
      data: {
        questionText: dto.questionText ?? existing.questionText,
        type,
        options:
          type === QuestionType.MULTIPLE_CHOICE && options
            ? (options as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        correctAnswer,
        explanation:
          dto.explanation !== undefined
            ? dto.explanation
            : existing.explanation,
        imageUrl: dto.imageUrl !== undefined ? dto.imageUrl : existing.imageUrl,
        explanationImg:
          dto.explanationImg !== undefined
            ? dto.explanationImg
            : existing.explanationImg,
      },
    });
  }

  async remove(teacherId: string, id: string): Promise<{ message: string }> {
    await this.findOwnedQuestion(teacherId, id);
    await this.prisma.question.delete({ where: { id } });
    return { message: 'Soal berhasil dihapus' };
  }

  private async findOwnedQuestion(
    teacherId: string,
    id: string,
  ): Promise<Question> {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question || question.teacherId !== teacherId) {
      throw new NotFoundException('Soal tidak ditemukan');
    }
    return question;
  }

  private resolveCorrectAnswer(
    type: QuestionType,
    options: string[] | null | undefined,
    correctAnswer: string,
  ): string {
    if (type === QuestionType.ESSAY) {
      return correctAnswer.trim();
    }

    if (!options || options.length < 2) {
      throw new BadRequestException(
        'Soal pilihan ganda wajib memiliki minimal 2 opsi jawaban (options)',
      );
    }

    const answer = correctAnswer.trim();

    if (/^[a-j]$/.test(answer.toLowerCase())) {
      const index = answer.toUpperCase().charCodeAt(0) - 65;
      if (index >= options.length) {
        throw new BadRequestException(
          `Kunci jawaban "${answer.toUpperCase()}" berada di luar jumlah opsi yang tersedia`,
        );
      }
      return answer.toUpperCase();
    }

    const exactIndex = options.findIndex((option) => option.trim() === answer);
    if (exactIndex !== -1) {
      return String.fromCharCode(65 + exactIndex);
    }

    const strippedAnswer = this.stripOptionPrefix(answer);
    const looseIndex = options.findIndex(
      (option) => this.stripOptionPrefix(option) === strippedAnswer,
    );
    if (looseIndex !== -1) {
      return String.fromCharCode(65 + looseIndex);
    }

    throw new BadRequestException(
      'Kunci jawaban (correctAnswer) harus berupa huruf opsi (A, B, C, ...) atau salah satu teks opsi yang diberikan',
    );
  }

  private stripOptionPrefix(value: string): string {
    return value.replace(/^[a-j][.)]\s*/i, '').trim();
  }
}
