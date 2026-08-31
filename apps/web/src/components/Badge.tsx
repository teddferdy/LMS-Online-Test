import type { ReactNode } from 'react'

type Tone = 'success' | 'danger' | 'draft' | 'info' | 'warning'

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  dot?: boolean
}

const styles: Record<Tone, string> = {
  success:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 [&>span]:bg-emerald-500',
  danger:
    'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800 [&>span]:bg-rose-500',
  draft:
    'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 [&>span]:bg-slate-500',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border-sky-300 dark:border-sky-800 [&>span]:bg-sky-500',
  warning:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 border-amber-300 dark:border-amber-800/50 [&>span]:bg-amber-500',
}

export function Badge({ tone = 'info', children, dot = false }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full"></span>}
      {children}
    </span>
  )
}
