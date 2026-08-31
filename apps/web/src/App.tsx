import { useEffect } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { ToastProvider } from './components/Toast'
import { RequireAuth } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { QuestionBankPage } from './pages/QuestionBankPage'
import { QuestionFormPage } from './pages/QuestionFormPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { AssignmentCreatePage } from './pages/AssignmentCreatePage'
import { MyAssignmentsPage } from './pages/MyAssignmentsPage'
import { TakeExamPage } from './pages/TakeExamPage'
import { ReviewPage } from './pages/ReviewPage'

function HomeRedirect() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!user) navigate('/login')
    else if (user.role === 'GURU') navigate('/guru')
    else navigate('/murid')
  }, [user, loading, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route
                path="/guru"
                element={
                  <RequireAuth role="GURU">
                    <QuestionBankPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/guru/soal/buat"
                element={
                  <RequireAuth role="GURU">
                    <QuestionFormPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/guru/soal/edit"
                element={
                  <RequireAuth role="GURU">
                    <QuestionFormPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/guru/soal/:id/edit"
                element={
                  <RequireAuth role="GURU">
                    <QuestionFormPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/guru/tugas"
                element={
                  <RequireAuth role="GURU">
                    <AssignmentsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/guru/tugas/buat"
                element={
                  <RequireAuth role="GURU">
                    <AssignmentCreatePage />
                  </RequireAuth>
                }
              />

              <Route
                path="/murid"
                element={
                  <RequireAuth role="MURID">
                    <MyAssignmentsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/murid/tugas/:id/kerjakan"
                element={
                  <RequireAuth role="MURID">
                    <TakeExamPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/murid/tugas/:id/review"
                element={
                  <RequireAuth role="MURID">
                    <ReviewPage />
                  </RequireAuth>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
