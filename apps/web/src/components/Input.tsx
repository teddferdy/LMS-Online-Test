import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const baseClasses =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

interface FieldProps {
  label?: string
  children: React.ReactNode
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </span>
      )}
      {children}
    </label>
  )
}

export function Input({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${baseClasses} ${className}`} {...rest} />
}

export function Textarea({
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${baseClasses} min-h-[96px] resize-y ${className}`}
      {...rest}
    />
  )
}

export function Select({
  className = '',
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${baseClasses} ${className}`} {...rest} />
  )
}
