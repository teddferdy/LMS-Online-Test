import type { ReactNode } from 'react'
import { Button } from './Button'

type Tone = 'success' | 'danger' | 'neutral' | 'info'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  tone?: Tone
  icon?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  maxWidth?: string
}

const borderByTone: Record<Tone, string> = {
  success: 'border-emerald-100 dark:border-emerald-900/50',
  danger: 'border-rose-100 dark:border-rose-900/50',
  neutral: 'border-slate-200 dark:border-slate-700',
  info: 'border-slate-200 dark:border-slate-700',
}

const circleByTone: Record<Tone, string> = {
  success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400',
  danger: 'bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  info: 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400',
}

export function Modal({
  open,
  title,
  tone = 'info',
  icon,
  children,
  actions,
  maxWidth = 'max-w-md',
}: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidth} rounded-2xl border bg-white p-6 text-center shadow-2xl dark:bg-slate-800 ${borderByTone[tone]}`}
      >
        {icon !== undefined && (
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${circleByTone[tone]}`}
          >
            {icon}
          </div>
        )}
        {title && (
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        )}
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {children}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-5">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'success'
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  icon?: ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Ya, Hapus',
  cancelLabel = 'Batal',
  tone = 'danger',
  onConfirm,
  onCancel,
  loading,
  icon,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onCancel}
      title={title}
      tone={tone}
      icon={icon ?? (tone === 'danger' ? '✕' : '✓')}
      actions={
        <>
          <Button variant="neutral" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'success'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </Button>
        </>
      }
    >
      {description && <p>{description}</p>}
    </Modal>
  )
}
