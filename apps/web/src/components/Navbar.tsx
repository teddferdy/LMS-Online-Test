import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Moon, Sun, LogOut, BookOpen } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'

export function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const navItems =
    user?.role === 'GURU'
      ? [
          { to: '/guru', label: 'Bank Soal' },
          { to: '/guru/tugas', label: 'Tugas' },
        ]
      : user?.role === 'MURID'
        ? [{ to: '/murid', label: 'Tugas Saya' }]
        : [{ to: '/', label: 'Beranda' }]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-8">
        <div className="flex items-center gap-3">
          <Link to={user ? (user.role === 'GURU' ? '/guru' : '/murid') : '/'}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-lg font-bold text-white shadow-md shadow-sky-500/20 dark:bg-sky-500">
              L
            </div>
          </Link>
          <span className="hidden text-base font-bold tracking-tight sm:inline-block">
            LesAcademy LMS
          </span>
        </div>

        {user && (
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="hidden items-center gap-2 sm:inline-flex">
                <BookOpen className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {user.name}
                </span>
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {user.role}
                </span>
              </span>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            onClick={toggleTheme}
            title="Ganti tema"
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
