import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileQuestion,
  Plus,
  Save,
  X,
} from 'lucide-react'
import { api } from '../lib/api'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Field, Input, Select, Textarea } from '../components/Input'
import { useToast } from '../components/Toast'
import type { Question, QuestionInput, QuestionType } from '../lib/types'

type FormState = QuestionInput & { _id?: string }

const emptyForm = (): QuestionInput => ({
  questionText: '',
  type: 'MULTIPLE_CHOICE',
  options: ['', ''],
  correctAnswer: '',
  explanation: '',
  imageUrl: '',
  explanationImg: '',
})

function isComplete(f: FormState): boolean {
  if (!f.questionText.trim()) return false
  if (f.type === 'MULTIPLE_CHOICE') {
    if ((f.options ?? []).filter((o) => o.trim()).length < 2) return false
    if (!f.correctAnswer.trim()) return false
  } else if (!f.correctAnswer.trim()) {
    return false
  }
  return true
}

function validate(f: FormState, index: number): string | null {
  if (!f.questionText.trim()) return `Soal ${index + 1}: pertanyaan tidak boleh kosong.`
  if (f.type === 'MULTIPLE_CHOICE') {
    const options = (f.options ?? []).filter((o) => o.trim())
    if (options.length < 2) return `Soal ${index + 1}: minimal dua opsi jawaban.`
    if (!f.correctAnswer.trim())
      return `Soal ${index + 1}: tentukan kunci jawaban yang benar.`
  } else if (!f.correctAnswer.trim()) {
    return `Soal ${index + 1}: isi kunci jawaban / kata kunci.`
  }
  return null
}

function toForm(q: Question): QuestionInput {
  return {
    questionText: q.questionText,
    type: q.type,
    options: q.options ?? ['', ''],
    correctAnswer: q.correctAnswer,
    explanation: q.explanation ?? '',
    imageUrl: q.imageUrl ?? '',
    explanationImg: q.explanationImg ?? '',
  }
}

export function QuestionFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { show } = useToast()
  const navigate = useNavigate()

  const editIds = useMemo(() => {
    const raw = searchParams.get('ids')?.trim()
    if (raw) return raw.split(',').filter(Boolean)
    return []
  }, [searchParams])

  const isEditAny = Boolean(id) || editIds.length > 0
  const isBulkEdit = editIds.length > 0

  const [count, setCount] = useState(1)
  const [forms, setForms] = useState<FormState[]>(() => [
    { ...emptyForm() },
  ])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(isEditAny)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEditAny) return

    const qs = isBulkEdit && id ? [...editIds, id] : editIds
    const singleId = isEditAny && !isBulkEdit ? id : undefined

    if (singleId) {
      api<Question>(`/questions/${singleId}`)
        .then((q) => {
          setForms([{ ...toForm(q), _id: q.id }])
          setCount(1)
        })
        .catch((err) => {
          show(
            'danger',
            'Gagal Memuat Soal',
            err instanceof Error ? err.message : 'Terjadi kesalahan',
          )
          navigate('/guru')
        })
        .finally(() => setLoading(false))
      return
    }

    if (qs.length > 0) {
      Promise.all(qs.map((qid) => api<Question>(`/questions/${qid}`)))
        .then((loaded) => {
          setForms(loaded.map((q) => ({ ...toForm(q), _id: q.id })))
          setCount(loaded.length)
        })
        .catch((err) => {
          show(
            'danger',
            'Gagal Memuat Soal',
            err instanceof Error ? err.message : 'Terjadi kesalahan',
          )
          navigate('/guru')
        })
        .finally(() => setLoading(false))
    }
  }, [isEditAny, isBulkEdit, id, editIds, navigate, show])

  const updateForm = (index: number, patch: Partial<QuestionInput>) => {
    setForms((all) => all.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const setType = (index: number, type: QuestionType) => {
    setForms((all) =>
      all.map((f, i) =>
        i === index
          ? { ...f, type, options: type === 'MULTIPLE_CHOICE' ? f.options : undefined }
          : f,
      ),
    )
  }

  const setOption = (index: number, optIndex: number, value: string) => {
    setForms((all) =>
      all.map((f, i) => {
        if (i !== index) return f
        const next = [...(f.options ?? [])]
        next[optIndex] = value
        return { ...f, options: next }
      }),
    )
  }

  const addOption = (index: number) => {
    setForms((all) =>
      all.map((f, i) =>
        i === index ? { ...f, options: [...(f.options ?? []), ''] } : f,
      ),
    )
  }

  const removeOption = (index: number, optIndex: number) => {
    setForms((all) =>
      all.map((f, i) =>
        i === index
          ? { ...f, options: (f.options ?? []).filter((_, oi) => oi !== optIndex) }
          : f,
      ),
    )
  }

  const applyCount = (n: number) => {
    const size = Math.max(1, Math.min(500, n || 1))
    setCount(size)
    setForms((all) => {
      const next = [...all]
      while (next.length < size) next.push({ ...emptyForm() })
      return next.slice(0, size)
    })
    setCurrent((c) => Math.min(c, size - 1))
  }

  const removeForm = (index: number) => {
    if (forms.length <= 1) return
    const nextForms = forms.filter((_, i) => i !== index)
    setCount(nextForms.length)
    setForms(nextForms)
    setCurrent((c) => Math.min(c, nextForms.length - 1))
  }

  const goTo = (i: number) =>
    setCurrent(Math.max(0, Math.min(forms.length - 1, i)))

  const completed = forms.filter(isComplete).length
  const pct = forms.length ? Math.round((completed / forms.length) * 100) : 0

  const toPayload = (f: FormState): QuestionInput => ({
    questionText: f.questionText.trim(),
    type: f.type,
    correctAnswer: f.correctAnswer.trim(),
    explanation: f.explanation?.trim() || undefined,
    imageUrl: f.imageUrl?.trim() || undefined,
    explanationImg: f.explanationImg?.trim() || undefined,
    ...(f.type === 'MULTIPLE_CHOICE'
      ? { options: (f.options ?? []).map((o) => o.trim()).filter(Boolean) }
      : {}),
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const invalidIndex = forms.findIndex((f) => validate(f, 0) !== null)
    if (invalidIndex !== -1) {
      const err = validate(forms[invalidIndex], invalidIndex)
      goTo(invalidIndex)
      show('danger', 'Soal Belum Lengkap', err!)
      return
    }

    setSaving(true)
    try {
      if (isBulkEdit) {
        await api('/questions/bulk', {
          method: 'PUT',
          body: {
            questions: forms.map((f) => ({ id: f._id!, ...toPayload(f) })),
          },
        })
        show('success', 'Soal Diperbarui', `Berhasil memperbarui ${forms.length} soal.`)
      } else if (isEditAny && id) {
        await api(`/questions/${id}`, { method: 'PUT', body: toPayload(forms[0]) })
        show('success', 'Soal Diperbarui', 'Soal berhasil diperbarui.')
      } else {
        await api('/questions/bulk', {
          method: 'POST',
          body: { questions: forms.map(toPayload) },
        })
        show('success', 'Soal Dibuat', `Berhasil menyimpan ${forms.length} soal.`)
      }
      navigate('/guru')
    } catch (err) {
      show(
        'danger',
        'Gagal Menyimpan',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
      </div>
    )
  }

  const form = forms[current]
  const currentDone = isComplete(form)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/guru')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            aria-label="Kembali ke Bank Soal"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                {isBulkEdit ? `Edit ${forms.length} Soal` : isEditAny ? 'Edit Soal' : 'Buat Soal Baru'}
              </h1>
              <Badge
                tone={isEditAny ? 'info' : 'success'}
                dot
              >
                {isBulkEdit ? 'Edit Massal' : isEditAny ? 'Edit' : 'Baru'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEditAny
                ? 'Tinjau dan ubah detail setiap soal lalu simpan.'
                : 'Tentukan jumlah soal, isi setiap soal, lalu simpan sekaligus.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configuration */}
        {!isEditAny && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Konfigurasi Soal
              </h2>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <Field label="Jumlah Soal">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={count}
                  onChange={(e) => applyCount(Number(e.target.value))}
                  className="w-44"
                />
              </Field>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Progres pengisian</span>
                  <span>
                    {completed}/{forms.length} lengkap ({pct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Navigator */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Navigasi Soal
              </h2>
              <span className="text-xs font-medium text-slate-400">({forms.length} soal)</span>
            </div>
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
              Soal {current + 1} dari {forms.length}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-10 gap-1.5 sm:grid-cols-15">
            {forms.map((f, i) => {
              const active = i === current
              const done = isComplete(f)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={active ? 'true' : undefined}
                  title={`Soal ${i + 1}${done ? ' (lengkap)' : ' (belum lengkap)'}`}
                  className={`flex h-9 items-center justify-center rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    active
                      ? 'bg-sky-600 text-white ring-2 ring-sky-400 ring-offset-2 dark:ring-offset-slate-800'
                      : done
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50'
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500 dark:border-slate-700/50 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-emerald-500" /> Lengkap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-rose-200 dark:bg-rose-900/60" /> Belum lengkap
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-sky-600" /> Sedang dibuka
            </span>
          </div>
        </Card>

        {/* Question editor */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-700/50 dark:bg-slate-800/70 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">
                {current + 1}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Soal Nomor {current + 1}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {form.type === 'ESSAY' ? 'Essay / Isian' : 'Pilihan Ganda (PG)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentDone ? (
                <Badge tone="success" dot>
                  Lengkap
                </Badge>
              ) : (
                <Badge tone="danger" dot>
                  Perlu diisi
                </Badge>
              )}
              {forms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeForm(current)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  title="Hapus soal ini"
                >
                  <X className="h-3.5 w-3.5" /> Hapus
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Tipe Soal">
                <Select
                  value={form.type}
                  onChange={(e) => setType(current, e.target.value as QuestionType)}
                >
                  <option value="MULTIPLE_CHOICE">Pilihan Ganda (PG)</option>
                  <option value="ESSAY">Essay / Isian</option>
                </Select>
              </Field>
              <Field label="URL Gambar Soal (opsional)">
                <Input
                  value={form.imageUrl ?? ''}
                  onChange={(e) => updateForm(current, { imageUrl: e.target.value })}
                  placeholder="https://contoh.com/gambar.jpg"
                />
              </Field>
            </div>

            <Field label="Pertanyaan">
              <Textarea
                value={form.questionText}
                onChange={(e) =>
                  updateForm(current, { questionText: e.target.value })
                }
                placeholder="Tuliskan pertanyaan dengan jelas..."
                className="min-h-[110px]"
              />
            </Field>

            {form.type === 'MULTIPLE_CHOICE' ? (
              <>
                <div className="space-y-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Opsi Jawaban
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      (min. 2 opsi)
                    </span>
                  </span>
                  {form.options?.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                          opt.trim()
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <Input
                        value={opt}
                        onChange={(e) => setOption(current, oi, e.target.value)}
                        placeholder={`Opsi ${String.fromCharCode(65 + oi)}`}
                      />
                      {form.options!.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(current, oi)}
                          className="ml-1 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          title="Hapus opsi"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(current)}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
                  >
                    <Plus className="h-4 w-4" /> Tambah opsi
                  </button>
                </div>

                <Field label="Kunci Jawaban Benar (huruf, mis. A)">
                  <Input
                    value={form.correctAnswer}
                    onChange={(e) =>
                      updateForm(current, { correctAnswer: e.target.value })
                    }
                    placeholder="A"
                    className="w-32"
                  />
                </Field>
              </>
            ) : (
              <Field label="Kunci Jawaban / Kata Kunci">
                <Input
                  value={form.correctAnswer}
                  onChange={(e) =>
                    updateForm(current, { correctAnswer: e.target.value })
                  }
                  placeholder="Jawaban ideal (abaikan kapital/spasi)"
                />
              </Field>
            )}

            <div className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-5 dark:border-slate-700/50 sm:grid-cols-2">
              <Field label="Pembahasan (opsional)">
                <Textarea
                  value={form.explanation ?? ''}
                  onChange={(e) =>
                    updateForm(current, { explanation: e.target.value })
                  }
                  placeholder="Jelaskan alasan jawaban yang benar..."
                />
              </Field>
              <Field label="URL Gambar Pembahasan (opsional)">
                <Input
                  value={form.explanationImg ?? ''}
                  onChange={(e) =>
                    updateForm(current, { explanationImg: e.target.value })
                  }
                  placeholder="https://contoh.com/pembahasan.jpg"
                />
              </Field>
            </div>
          </div>
        </Card>

        {/* Prev/Next */}
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="neutral"
            disabled={current === 0}
            onClick={() => goTo(current - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={current === forms.length - 1}
            onClick={() => goTo(current + 1)}
          >
            Selanjutnya <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Sticky action bar */}
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/90">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {pct === 100 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <CircleAlert className="h-4 w-4 text-amber-500" />
            )}
            <span>
              {pct === 100
                ? 'Semua soal lengkap & siap disimpan'
                : `${forms.length - completed} soal belum lengkap`}
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="neutral"
              onClick={() => navigate('/guru')}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" variant="success" disabled={saving}>
              {saving ? (
                'Menyimpan...'
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditAny ? 'Simpan Perubahan' : `Simpan ${forms.length} Soal`}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
