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
    return this.prisma.question.create({
      data: this.toCreateData(teacherId, dto),
    });
  }

  async findAll(teacherId: string): Promise<Question[]> {
    return this.prisma.question.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMany(
    teacherId: string,
    dtos: CreateQuestionDto[],
  ): Promise<Question[]> {
    if (!dtos || dtos.length === 0) {
      throw new BadRequestException('Minimal satu soal diperlukan');
    }

    return this.prisma.$transaction(
      dtos.map((dto) =>
        this.prisma.question.create({
          data: this.toCreateData(teacherId, dto),
        }),
      ),
    );
  }

  async updateMany(
    teacherId: string,
    items: { id: string; dto: UpdateQuestionDto }[],
  ): Promise<Question[]> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Minimal satu soal diperlukan');
    }

    const ids = items.map((item) => item.id);
    const owned = await this.prisma.question.findMany({
      where: { id: { in: ids }, teacherId },
    });
    const ownedMap = new Map(owned.map((q) => [q.id, q]));
    const missing = ids.filter((id) => !ownedMap.has(id));
    if (missing.length > 0) {
      throw new NotFoundException('Beberapa soal tidak ditemukan');
    }

    const updates = items.map(({ id, dto }) => {
      const existing = ownedMap.get(id)!;
      return {
        id,
        data: this.toUpdateData(existing, dto),
      };
    });

    return this.prisma.$transaction(async (tx) => {
      const results: Question[] = [];
      for (const { id, data } of updates) {
        results.push(await tx.question.update({ where: { id }, data }));
      }
      return results;
    });
  }

  async findOne(teacherId: string, id: string): Promise<Question> {
    return this.findOwnedQuestion(teacherId, id);
  }

  async update(
    teacherId: string,
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<Question> {
    const existing = await this.findOwnedQuestion(teacherId, id);
    return this.prisma.question.update({
      where: { id },
      data: this.toUpdateData(existing, dto),
    });
  }

  async remove(teacherId: string, id: string): Promise<{ message: string }> {
    await this.findOwnedQuestion(teacherId, id);
    await this.prisma.question.delete({ where: { id } });
    return { message: 'Soal berhasil dihapus' };
  }

  private toCreateData(
    teacherId: string,
    dto: CreateQuestionDto,
  ): Prisma.QuestionCreateInput {
    const type = dto.type ?? QuestionType.MULTIPLE_CHOICE;
    const correctAnswer = this.resolveCorrectAnswer(
      type,
      dto.options,
      dto.correctAnswer,
    );
    return {
      teacher: { connect: { id: teacherId } },
      type,
      questionText: dto.questionText,
      imageUrl: dto.imageUrl,
      options:
        type === QuestionType.MULTIPLE_CHOICE ? dto.options : Prisma.JsonNull,
      correctAnswer,
      explanation: dto.explanation,
      explanationImg: dto.explanationImg,
    };
  }

  private toUpdateData(
    existing: Question,
    dto: UpdateQuestionDto,
  ): Prisma.QuestionUpdateInput {
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
    return {
      questionText: dto.questionText ?? existing.questionText,
      type,
      options:
        type === QuestionType.MULTIPLE_CHOICE && options
          ? options
          : Prisma.JsonNull,
      correctAnswer,
      explanation:
        dto.explanation !== undefined ? dto.explanation : existing.explanation,
      imageUrl: dto.imageUrl !== undefined ? dto.imageUrl : existing.imageUrl,
      explanationImg:
        dto.explanationImg !== undefined
          ? dto.explanationImg
          : existing.explanationImg,
    };
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
