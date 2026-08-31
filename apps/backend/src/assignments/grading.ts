import { GradingStatus, Question, QuestionType } from '@prisma/client';

export interface ReviewItem {
  questionId: string;
  questionType: QuestionType;
  questionText: string;
  studentAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
}

export interface GradeResult {
  score: number;
  status: GradingStatus;
  review: ReviewItem[];
}

export type GradableQuestion = Pick<
  Question,
  'id' | 'type' | 'questionText' | 'correctAnswer' | 'explanation'
>;

const ESSAY_MANUAL_REVIEW_MIN_LENGTH = 50;

export function gradeAssignment(
  questions: GradableQuestion[],
  answers: Record<string, string>,
): GradeResult {
  const totalQuestions = questions.length;
  const pointPerQuestion = totalQuestions > 0 ? 100 / totalQuestions : 0;
  let totalScore = 0;
  let needsManualReview = false;
  const review: ReviewItem[] = [];

  for (const question of questions) {
    const rawAnswer = answers?.[question.id];
    const studentAnswer =
      typeof rawAnswer === 'string' && rawAnswer.trim().length > 0
        ? rawAnswer.trim()
        : null;
    let isCorrect = false;

    if (studentAnswer !== null) {
      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        isCorrect =
          studentAnswer.toUpperCase() ===
          question.correctAnswer.trim().toUpperCase();
      } else {
        const cleanStudentAnswer = normalizeText(studentAnswer);
        const cleanCorrectAnswer = normalizeText(question.correctAnswer);
        isCorrect = cleanStudentAnswer === cleanCorrectAnswer;

        if (
          !isCorrect &&
          cleanStudentAnswer.length > ESSAY_MANUAL_REVIEW_MIN_LENGTH
        ) {
          needsManualReview = true;
        }
      }
    }

    if (isCorrect) {
      totalScore += pointPerQuestion;
    }

    review.push({
      questionId: question.id,
      questionType: question.type,
      questionText: question.questionText,
      studentAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation ?? null,
    });
  }

  const score = Math.round(totalScore * 100) / 100;

  return {
    score,
    status: needsManualReview
      ? GradingStatus.NEEDS_REVIEW
      : GradingStatus.AUTO_GRADED,
    review,
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
