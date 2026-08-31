import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { useToast } from '../components/Toast'
import type { ReviewItem, ReviewResult } from '../lib/types'

export function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const { show } = useToast()
  const [data, setData] = useState<ReviewResult | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<ReviewResult>(`/assignments/${id}/review`)
      setData(res)
    } catch (err) {
      show(
        'danger',
        'Gagal Memuat',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
    } finally {
      setLoading(false)
    }
  }, [id, show])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
      </div>
    )
  }

  const summary = data.review.reduce(
    (acc: { answered: number; correct: number }, r: ReviewItem) => {
      if (r.studentAnswer === null || r.studentAnswer === '') return acc
      acc.answered++
      if (r.isCorrect) acc.correct++
      return acc
    },
    { answered: 0, correct: 0 },
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Hasil {data.assignment.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dikumpulkan{' '}
            {new Date(data.submittedAt).toLocaleString('id-ID')}
            {data.isTimeout && ' (otomatis karena waktu habis)'}
          </p>
        </div>
        <Button variant="neutral" onClick={() => (window.location.href = '/murid')}>
          Kembali
        </Button>
      </div>

      {/* Score card */}
      <Card className="flex flex-col items-center p-6 text-center sm:p-8">
        <Badge
          tone={data.status === 'AUTO_GRADED' ? 'success' : 'warning'}
          dot
        >
          {data.status === 'AUTO_GRADED'
            ? 'Dinilai Otomatis'
            : 'Butuh Review Guru'}
        </Badge>
        <div className="my-4 text-5xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400">
          {data.score}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Benar {summary.correct} dari {data.review.length} soal
        </p>
      </Card>

      {/* Review list */}
      <div className="space-y-4">
        {data.review.map((r: ReviewItem, idx) => (
          <Card key={r.questionId} className="p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Soal {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <Badge tone={r.questionType === 'ESSAY' ? 'info' : 'warning'}>
                  {r.questionType === 'ESSAY' ? 'Essay' : 'PG'}
                </Badge>
                {r.isCorrect ? (
                  <Badge tone="success" dot>
                    <CheckCircle2 className="h-3 w-3" /> Benar
                  </Badge>
                ) : (
                  <Badge tone="danger" dot>
                    <XCircle className="h-3 w-3" /> Salah
                  </Badge>
                )}
              </div>
            </div>

            <p className="mb-4 text-sm font-medium text-slate-800 dark:text-slate-100">
              {r.questionText}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Jawaban Kamu
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                  {r.studentAnswer || (
                    <span className="text-slate-400">(tidak dijawab)</span>
                  )}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Jawaban Benar
                </p>
                <p className="mt-1 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  {r.correctAnswer}
                </p>
              </div>
            </div>

            {r.explanation && (
              <div className="mt-3 rounded-xl border border-amber-200/60 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/40">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Pembahasan
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {r.explanation}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
