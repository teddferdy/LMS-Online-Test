import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Play } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { useToast } from '../components/Toast'
import type { Assignment } from '../lib/types'

export function MyAssignmentsPage() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Assignment[]>('/assignments/student')
      setAssignments(data)
    } catch {
      show('danger', 'Gagal Memuat', 'Tidak dapat memuat daftar tugas.')
    } finally {
      setLoading(false)
    }
  }, [show])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Tugas Saya
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Daftar tugas/latihan yang ditugaskan padamu.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
        </div>
      ) : assignments.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            Belum ada tugas
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kamu belum punya tugas aktif.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {assignments.map((a) => {
            const submitted = a.submissions && a.submissions.length > 0
            const hasReview =
              a.submissions?.[0]?.score !== undefined &&
              a.submissions?.[0]?.score !== null
            return (
              <Card
                key={a.id}
                className="flex flex-col p-5 sm:p-6 transition-all hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 dark:text-slate-100">
                    {a.title}
                  </h2>
                  {submitted ? (
                    <Badge tone="success" dot>
                      Selesai
                    </Badge>
                  ) : (
                    <Badge tone="warning" dot>
                      Belum dikerjakan
                    </Badge>
                  )}
                </div>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  Guru: {a.teacher?.name ?? 'N/A'}
                </p>
                <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{a.questionIds.length} soal</span>
                  <span>{a.durationMin} menit</span>
                  <span>
                    Batas: {new Date(a.dueDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div className="mt-auto flex justify-end">
                  {hasReview ? (
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/murid/tugas/${a.id}/review`)}
                    >
                      <Play className="h-4 w-4" /> Lihat Hasil
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      onClick={() => navigate(`/murid/tugas/${a.id}/kerjakan`)}
                    >
                      <Play className="h-4 w-4" /> Kerjakan
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
