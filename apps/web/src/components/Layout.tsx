import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useAuth } from '../lib/auth'
import type { Role } from '../lib/types'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode
  role?: Role
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'GURU' ? '/guru' : '/murid'} replace />
  }

  return <Layout>{children}</Layout>
}
