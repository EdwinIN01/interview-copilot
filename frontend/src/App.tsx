import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Resume from './pages/Resume'
import CreateInterview from './pages/CreateInterview'
import InterviewRoom from './pages/InterviewRoom'
import Report from './pages/Report'
import History from './pages/History'
import Knowledge from './pages/Knowledge'
import Profile from './pages/Profile'
import ShareReport from './pages/ShareReport'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/share/:token" element={<ShareReport />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="resume" element={<Resume />} />
        <Route path="interviews/create" element={<CreateInterview />} />
        <Route path="interviews/:id" element={<InterviewRoom />} />
        <Route path="interviews/:id/report" element={<Report />} />
        <Route path="history" element={<History />} />
        <Route path="knowledge" element={<Knowledge />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
