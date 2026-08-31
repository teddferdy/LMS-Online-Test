import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button } from '../components/Button'
import { Field, Input } from '../components/Input'
import { useToast } from '../components/Toast'

export function LoginPage() {
  const { login, user } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to={user.role === 'GURU' ? '/guru' : '/murid'} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'GURU' ? '/guru' : '/murid')
    } catch (err) {
      show(
        'danger',
        'Login Gagal',
        err instanceof Error ? err.message : 'Terjadi kesalahan',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm dark:border-slate-700/60 dark:bg-slate-800">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-xl font-bold text-white shadow-md shadow-sky-500/20 dark:bg-sky-500">
            L
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Selamat Datang
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Masuk ke akun LesAcademy LMS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Belum punya akun?{' '}
          <Link
            to="/register"
            className="font-semibold text-sky-600 hover:underline dark:text-sky-400"
          >
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  )
}
