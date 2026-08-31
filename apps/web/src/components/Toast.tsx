import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { Modal } from './Modal'

type ToastTone = 'success' | 'danger'

interface ToastState {
  open: boolean
  tone: ToastTone
  title: string
  message?: string
  onClose?: () => void
}

const ToastContext = createContext<{
  show: (tone: ToastTone, title: string, message?: string) => void
}>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const show = (tone: ToastTone, title: string, message?: string) => {
    setToast({ open: true, tone, title, message })
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Modal
        open={!!toast?.open}
        onClose={() => setToast(null)}
        title={toast?.title}
        tone={toast?.tone}
        icon={toast?.tone === 'success' ? '✓' : '✕'}
        actions={
          <button
            onClick={() => setToast(null)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Tutup
          </button>
        }
      >
        {toast?.message && <p>{toast.message}</p>}
      </Modal>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
