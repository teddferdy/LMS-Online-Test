import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '../components/Button'
import { Field, Input, Select } from '../components/Input'
import { Card } from '../components/Card'
import { useToast } from '../components/Toast'
import type { Question } from '../lib/types'

export function AssignmentCreatePage() {
  const { show } = useToast()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [durationMin, setDurationMin] = useState(60)
  const [dueDate, setDueDate] = useState('')
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    api<Question[]>('/questions')
      .then((qs) => {
        setQuestions(qs)
        setLoadingQuestions(false)
      })
      .catch(() => {
        setLoadingQuestions(false)
        show('danger', 'Gagal Memuat', 'Tidak dapat memuat soal.')
      })
  }, [show])

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) => {
    if (list.includes(id)) setList(list.filter((x) => x !== id))
    else setList([...list, id])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (selectedQuestionIds.length === 0) {
      show('danger', 'Pilih Soal', 'Pilih minimal satu soal.')
      return
    }
    if (selectedStudentIds.length === 0) {
      show('danger', 'Pilih Murid', 'Pilih minimal satu murid.')
      return
    }
    setSaving(true)
    try {
      await api('/assignments', {
        method: 'POST',
        body: {
          title,
          questionIds: selectedQuestionIds,
          studentIds: selectedStudentIds,
          durationMin,
          dueDate,
          isPublished,
        },
      })
      show('success', 'Tugas Dibuat', 'Tugas berhasil ditugaskan.')
      navigate('/guru/tugas')
    } catch (err) {
      show(
        'danger',
        'Gagal Membuat Tugas',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Buat Tugas Baru
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tugaskan kumpulan soal ke satu atau beberapa murid.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-4 p-5 sm:p-6">
          <Field label="Judul Tugas">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mis. Latihan Matematika Bab 3"
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Durasi (menit)">
              <Input
                type="number"
                min={1}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </Field>
            <Field label="Batas Waktu">
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Status">
              <Select
                value={isPublished ? 'published' : 'draft'}
                onChange={(e) =>
                  setIsPublished(e.target.value === 'published')
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">
            Pilih Soal ({selectedQuestionIds.length} dipilih)
          </h2>
          {loadingQuestions ? (
            <div className="py-6 text-center text-sm text-slate-500">
              Memuat soal...
            </div>
          ) : questions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Belum ada soal. Buat soal dulu di Bank Soal.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {questions.map((q) => {
                const selected = selectedQuestionIds.includes(q.id)
                return (
                  <button
                    type="button"
                    key={q.id}
                    onClick={() =>
                      toggle(selectedQuestionIds, setSelectedQuestionIds, q.id)
                    }
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-sky-600 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/30'
                        : 'border-slate-200 hover:border-sky-400 dark:border-slate-700'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {q.type === 'ESSAY' ? 'Essay' : 'PG'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {selected ? '✓ Dipilih' : ''}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
                      {q.questionText}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">
            Tugaskan ke Murid
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            Masukkan ID murid (pisahkan dengan koma). Untuk V1, penugasan dikelola
            manual oleh Guru.
          </p>
          <Input
            value={selectedStudentIds.join(', ')}
            onChange={(e) =>
              setSelectedStudentIds(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="contoh: <uuid-murid-1>, <uuid-murid-2>"
          />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {selectedStudentIds.length} murid dipilih
          </p>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button variant="neutral" onClick={() => navigate('/guru/tugas')}>
            Batal
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="draft"
              onClick={() => {
                setIsPublished(false)
                // submit as draft
                const form = document.querySelector(
                  'form',
                ) as HTMLFormElement
                form?.requestSubmit()
              }}
              disabled={saving}
            >
              Save as Draft
            </Button>
            <Button type="submit" variant="success" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Tugaskan Sekarang'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
