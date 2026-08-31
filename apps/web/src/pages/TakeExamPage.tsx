import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flag, Send } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { SubmitResult, TakeAssignment } from '../lib/types'

export function TakeExamPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { show } = useToast()

  const [data, setData] = useState<TakeAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Record<string, boolean>>({})
  const [visited, setVisited] = useState<Set<number>>(new Set([0]))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const endTimeRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<TakeAssignment>(`/assignments/${id}/take`)
      setData(res)
      const serverTime = new Date(res.assignment.serverTime).getTime()
      endTimeRef.current =
        serverTime + res.assignment.durationMin * 60 * 1000
      const remaining = Math.max(
        0,
        Math.floor((endTimeRef.current - Date.now()) / 1000),
      )
      setTimeLeft(remaining)
    } catch (err) {
      show(
        'danger',
        'Gagal Memuat Tugas',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
      navigate('/murid')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, show])

  useEffect(() => {
    load()
  }, [load])

  const submit = useCallback(
    async (isTimeout: boolean) => {
      setSubmitting(true)
      try {
        const res = await api<SubmitResult>(`/assignments/${id}/submit`, {
          method: 'POST',
          body: { answers, isTimeout },
        })
        show(
          isTimeout ? 'danger' : 'success',
          isTimeout ? 'Waktu Habis' : 'Terkumpul',
          isTimeout
            ? `Waktu habis. Tugas otomatis dikumpulkan. Skor kamu ${res.score}.`
            : 'Jawaban berhasil dikumpulkan.',
        )
        navigate(`/murid/tugas/${id}/review`, { replace: true })
      } catch (err) {
        show(
          'danger',
          'Gagal Mengirim',
          err instanceof Error ? err.message : 'Terjadi kesalahan',
        )
      } finally {
        setSubmitting(false)
      }
    },
    [answers, id, navigate, show],
  )

  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) {
      submit(true)
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => (s ?? 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, submit])

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
      </div>
    )
  }

  const { questions } = data
  const q = questions[current]
  const mm = String(Math.floor((timeLeft ?? 0) / 60)).padStart(2, '0')
  const ss = String((timeLeft ?? 0) % 60).padStart(2, '0')
  const answeredCount = Object.keys(answers).length
  const flaggedCount = Object.values(flagged).filter(Boolean).length

  const setAnswer = (qid: string, value: string) =>
    setAnswers((a) => ({ ...a, [qid]: value }))

  const toggleFlag = (qid: string) =>
    setFlagged((f) => ({ ...f, [qid]: !f[qid] }))

  const goToQuestion = (i: number) => {
    setCurrent(i)
    setVisited((v) => new Set(v).add(i))
  }

  const statusClass = (qi: number) => {
    const qid = questions[qi].id
    if (answers[qid]) return 'bg-emerald-500 text-white'
    if (flagged[qid]) return 'bg-amber-500 text-white'
    if (visited.has(qi)) return 'bg-rose-500 text-white'
    return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header with timer & flag */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
            {data.assignment.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {answeredCount}/{questions.length} terjawab
            {flaggedCount > 0 && ` • ${flaggedCount} ragu-ragu`}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 font-mono text-xs font-semibold text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-400 sm:text-sm">
          <svg
            className="h-4 w-4 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {mm} : {ss}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main question area */}
        <main className="lg:col-span-8">
          <Card className="space-y-6 p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-700/50">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 sm:text-lg">
                Soal Nomor {current + 1}
              </h2>
              <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                {q.type === 'ESSAY' ? 'Essay' : 'Pilihan Ganda'}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 sm:text-base">
              {q.questionText}
            </p>

            {q.imageUrl && (
              <img
                src={q.imageUrl}
                alt="Soal"
                className="h-40 w-full rounded-xl object-cover"
              />
            )}

            {q.type === 'MULTIPLE_CHOICE' ? (
              <div className="space-y-3">
                {q.options?.map((opt, i) => {
                  const selected = answers[q.id] === String.fromCharCode(65 + i)
                  return (
                    <label
                      key={i}
                      className={`flex cursor-pointer items-center p-3.5 transition-all sm:p-4 ${
                        selected
                          ? 'rounded-xl border-2 border-sky-600 bg-sky-50/60 dark:border-sky-400 dark:bg-sky-950/30'
                          : 'rounded-xl border border-slate-200 bg-slate-50/50 hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-sky-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={selected}
                        onChange={() =>
                          setAnswer(q.id, String.fromCharCode(65 + i))
                        }
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500 dark:bg-slate-900 dark:border-slate-700"
                      />
                      <span
                        className={`ml-3 text-sm ${
                          selected
                            ? 'font-semibold text-sky-900 dark:text-sky-200'
                            : 'font-medium text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {opt}
                      </span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Tulis jawabanmu di sini..."
                className="min-h-[120px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700/50">
              <div className="flex gap-2">
                <Button
                  variant="neutral"
                  className={
                    flagged[q.id]
                      ? '!border-amber-500 !bg-amber-500 !text-white'
                      : ''
                  }
                  onClick={() => toggleFlag(q.id)}
                >
                  <Flag className="h-4 w-4" /> Ragu-ragu
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="neutral"
                  disabled={current === 0}
                  onClick={() => goToQuestion(Math.max(0, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button
                  variant="primary"
                  disabled={current === questions.length - 1}
                  onClick={() =>
                    goToQuestion(Math.min(questions.length - 1, current + 1))
                  }
                >
                  Selanjutnya <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="mt-6 flex justify-between">
            <Button variant="neutral" onClick={() => navigate('/murid')}>
              Keluar tanpa mengumpulkan
            </Button>
            <Button
              variant="success"
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="h-4 w-4" /> Kumpulkan Jawaban
            </Button>
          </div>
        </main>

        {/* Sidebar navigation */}
        <aside className="lg:col-span-4">
          <Card className="p-5 sm:p-6">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Navigasi Soal
            </h3>
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((question, i) => (
                <button
                  key={question.id}
                  onClick={() => goToQuestion(i)}
                  className={`h-10 rounded-xl text-xs font-bold transition-all ${
                    i === current
                      ? 'bg-sky-600 text-white ring-2 ring-sky-400 ring-offset-2 dark:ring-offset-slate-800'
                      : statusClass(i)
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-emerald-500"></span>
                Terjawab
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-rose-500"></span>
                Dikunjungi, belum dijawab
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-amber-500"></span>
                Ragu-ragu
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-slate-200 dark:bg-slate-700"></span>
                Belum dikunjungi
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Kumpulkan Jawaban?"
        description={`Kamu sudah menjawab ${answeredCount} dari ${questions.length} soal. Setelah dikumpulkan, jawaban tidak bisa diubah.`}
        confirmLabel="Ya, Kumpulkan"
        cancelLabel="Batal"
        tone="success"
        loading={submitting}
        onConfirm={() => submit(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
