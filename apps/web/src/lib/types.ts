export type Role = 'GURU' | 'MURID'
export type QuestionType = 'MULTIPLE_CHOICE' | 'ESSAY'
export type GradingStatus = 'AUTO_GRADED' | 'NEEDS_REVIEW'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export interface Question {
  id: string
  teacherId: string
  type: QuestionType
  questionText: string
  imageUrl: string | null
  options: string[] | null
  correctAnswer: string
  explanation: string | null
  explanationImg: string | null
  createdAt: string
}

export interface QuestionInput {
  questionText: string
  type: QuestionType
  options?: string[]
  correctAnswer: string
  explanation?: string
  imageUrl?: string
  explanationImg?: string
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  answers: Record<string, string>
  score: number
  status: GradingStatus
  isTimeout: boolean
  review: unknown
  submittedAt: string
}

export interface Assignment {
  id: string
  title: string
  questionIds: string[]
  teacherId: string
  studentId: string
  durationMin: number
  isPublished: boolean
  dueDate: string
  createdAt: string
  teacher?: { id: string; name: string; email?: string }
  student?: { id: string; name: string; email?: string }
  submissions?: Submission[]
}

export interface AssignmentInput {
  title: string
  questionIds: string[]
  studentIds: string[]
  durationMin: number
  dueDate: string
  isPublished?: boolean
}

export interface TakeAssignment {
  assignment: {
    id: string
    title: string
    durationMin: number
    dueDate: string
    serverTime: string
  }
  questions: {
    id: string
    type: QuestionType
    questionText: string
    imageUrl: string | null
    options: string[] | null
  }[]
}

export interface ReviewItem {
  questionId: string
  questionType: QuestionType
  questionText: string
  studentAnswer: string | null
  correctAnswer: string
  isCorrect: boolean
  explanation: string | null
}

export interface SubmitResult {
  message: string
  submissionId: string
  score: number
  status: GradingStatus
  summary: { totalQuestions: number; correct: number; wrong: number }
  review: ReviewItem[]
}

export interface ReviewResult {
  assignment: { id: string; title: string }
  score: number
  status: GradingStatus
  isTimeout: boolean
  submittedAt: string
  answers: Record<string, string>
  review: ReviewItem[]
}
