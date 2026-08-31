import { useCallback, useEffect, useState } from 'react'
import { Plus, Download, Send } from 'lucide-react'
import { api, getToken } from '../lib/api'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { useToast } from '../components/Toast'
import type { Assignment } from '../lib/types'

export function AssignmentsPage() {
  const { show } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Assignment[]>('/assignments/teacher')
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

  const publish = async (id: string) => {
    try {
      const res = await api<{ message: string }>(
        `/assignments/${id}/publish`,
        { method: 'PATCH' },
      )
      show('success', 'Dipublikasikan', res.message)
      load()
    } catch (err) {
      show(
        'danger',
        'Gagal Publikasi',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
    }
  }

  const exportExcel = async (id: string, title: string) => {
    try {
      const token = getToken()
      const res = await fetch(`/api/assignments/${id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Export gagal')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap-nilai-${title.toLowerCase().replace(/\s+/g, '-')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      show('success', 'Export Berhasil', 'File rekap nilai berhasil diunduh.')
    } catch (err) {
      show(
        'danger',
        'Gagal Export',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Daftar Tugas
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola penugasan dan rekap nilai murid.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => (window.location.href = '/guru/tugas/buat')}
        >
          <Plus className="h-4 w-4" /> Buat Tugas
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
        </div>
      ) : assignments.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            Belum ada tugas
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Buat tugas pertama kamu.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const submission = a.submissions?.[0]
            return (
              <Card
                key={a.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100">
                      {a.title}
                    </h2>
                    {a.isPublished ? (
                      <Badge tone="success" dot>
                        Published
                      </Badge>
                    ) : (
                      <Badge tone="draft" dot>
                        Draft
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Murid: {a.student?.name ?? 'N/A'} (
                      {a.student?.email ?? '-'})
                    </span>
                    <span>{a.questionIds.length} soal</span>
                    <span>{a.durationMin} menit</span>
                    <span>
                      Batas:{' '}
                      {new Date(a.dueDate).toLocaleDateString('id-ID')}
                    </span>
                    {submission && (
                      <Badge
                        tone={
                          submission.status === 'AUTO_GRADED'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        Nilai: {submission.score}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="neutral"
                    onClick={() => exportExcel(a.id, a.title)}
                  >
                    <Download className="h-4 w-4" /> Export
                  </Button>
                  {!a.isPublished && (
                    <Button
                      variant="success"
                      onClick={() => publish(a.id)}
                    >
                      <Send className="h-4 w-4" /> Publikasi
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
