import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all dark:border-slate-700/60 dark:bg-slate-800 ${className}`}
    >
      {children}
    </div>
  )
}
