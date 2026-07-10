import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './state/auth'
import { PlatformAuthProvider } from './state/platformAuth'
import { RequireOrgAuth, RequireAdmin, RequireRole, RequirePlatformAuth } from './components/RouteGuards'

import Landing from './pages/Landing'
import Intro from './pages/Intro'
import SignupOrg from './pages/SignupOrg'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DeveloperDashboard from './pages/DeveloperDashboard'
import TesterDashboard from './pages/TesterDashboard'
import ProjectDetail from './pages/ProjectDetail'
import ReportBug from './pages/ReportBug'
import BugDetail from './pages/BugDetail'
import AdminPanel from './pages/AdminPanel'
import PlatformAdminLogin from './pages/PlatformAdminLogin'
import PlatformAdminDashboard from './pages/PlatformAdminDashboard'

export default function App() {
  return (
    <AuthProvider>
      <PlatformAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/intro" element={<Intro />} />
            <Route path="/signup" element={<SignupOrg />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <RequireOrgAuth>
                  <Dashboard />
                </RequireOrgAuth>
              }
            />

            {/* Developer-only bug queue */}
            <Route
              path="/dev"
              element={
                <RequireRole roles={['developer', 'admin']}>
                  <DeveloperDashboard />
                </RequireRole>
              }
            />

            {/* Tester-only "my reports" home */}
            <Route
              path="/tester"
              element={
                <RequireRole roles={['tester', 'admin']}>
                  <TesterDashboard />
                </RequireRole>
              }
            />

            <Route
              path="/projects/:projectId"
              element={
                <RequireOrgAuth>
                  <ProjectDetail />
                </RequireOrgAuth>
              }
            />
            <Route
              path="/report"
              element={
                <RequireRole roles={['tester', 'admin']}>
                  <ReportBug />
                </RequireRole>
              }
            />
            <Route
              path="/bugs/:bugId"
              element={
                <RequireOrgAuth>
                  <BugDetail />
                </RequireOrgAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminPanel />
                </RequireAdmin>
              }
            />

            <Route path="/platform-admin/login" element={<PlatformAdminLogin />} />
            <Route
              path="/platform-admin"
              element={
                <RequirePlatformAuth>
                  <PlatformAdminDashboard />
                </RequirePlatformAuth>
              }
            />

            <Route path="*" element={<Landing />} />
          </Routes>
        </BrowserRouter>
      </PlatformAuthProvider>
    </AuthProvider>
  )
}
