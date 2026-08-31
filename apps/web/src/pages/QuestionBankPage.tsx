import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, FileText, ListChecks } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import type { Question } from '../lib/types'

export function QuestionBankPage() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<Question | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<Question[]>('/questions')
      setQuestions(data)
    } catch {
      show('danger', 'Gagal Memuat', 'Tidak dapat memuat bank soal.')
    } finally {
      setLoading(false)
    }
  }, [show])

  useEffect(() => {
    load()
  }, [load])

  const toggleSelect = (id: string) =>
    setSelectedIds((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id],
    )

  const goToBulkEdit = () => {
    if (selectedIds.length > 0) {
      navigate(`/guru/soal/edit?ids=${selectedIds.join(',')}`)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await api(`/questions/${deleting.id}`, { method: 'DELETE' })
      show('success', 'Soal Dihapus', 'Soal berhasil dihapus dari bank soal.')
      setDeleting(null)
      load()
    } catch (err) {
      show(
        'danger',
        'Gagal Menghapus',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Bank Soal
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola kumpulan soal untuk penugasan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button variant="primary" onClick={goToBulkEdit}>
              <Pencil className="h-4 w-4" /> Edit Terpilih ({selectedIds.length})
            </Button>
          )}
          <Button variant="neutral" onClick={() => navigate('/guru/soal/buat')}>
            <Plus className="h-4 w-4" /> Buat Soal
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/30">
          <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">
            {selectedIds.length} soal dipilih. Klik "Edit Terpilih" untuk mengubah
            semuanya sekaligus.
          </p>
          <button
            onClick={() => setSelectedIds([])}
            className="text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            Batal pilih
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
        </div>
      ) : questions.length === 0 ? (
        <Card className="p-10 text-center">
          <ListChecks className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">
            Belum ada soal
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Buat soal pertama kamu untuk mulai menugaskan latihan.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {questions.map((q) => (
            <Card
              key={q.id}
              className="flex flex-col p-5 transition-all hover:shadow-md sm:p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800"
                />
                <div className="flex flex-1 items-center justify-between">
                  <Badge tone={q.type === 'ESSAY' ? 'info' : 'warning'}>
                    {q.type === 'ESSAY' ? 'Essay' : 'Pilihan Ganda'}
                  </Badge>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(q.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                {selectedIds.includes(q.id) && (
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                    ✓
                  </span>
                )}
              </div>

              <p className="mb-4 flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                {q.questionText}
              </p>

              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt="Soal"
                  className="mb-4 h-32 w-full rounded-xl object-cover"
                />
              )}

              <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <FileText className="h-3.5 w-3.5" />
                <span>
                  Kunci: {q.correctAnswer}
                  {q.explanation ? ' • Ada pembahasan' : ''}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/50">
                <Button
                  variant="draft"
                  onClick={() => navigate(`/guru/soal/${q.id}/edit`)}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="danger" onClick={() => setDeleting(q)}>
                  <Trash2 className="h-4 w-4" /> Hapus
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Hapus Soal?"
        description={`Soal "${deleting?.questionText.slice(0, 60)}..." akan dihapus permanen.`}
        confirmLabel="Ya, Hapus"
        tone="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
