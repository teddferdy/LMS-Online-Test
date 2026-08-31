import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'success' | 'danger' | 'draft' | 'neutral'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const styles: Record<Variant, string> = {
  primary:
    'text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 shadow-md shadow-sky-500/20',
  success:
    'text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 shadow-md shadow-emerald-500/20',
  danger:
    'text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400 shadow-md shadow-rose-500/20',
  draft:
    'text-slate-700 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
  neutral:
    'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 shadow-sm',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
