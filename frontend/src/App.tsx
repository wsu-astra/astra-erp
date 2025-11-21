import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { BusinessProvider } from './contexts/BusinessContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastContainer } from './components/Toast'

// Pages
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Employees from './pages/Employees'
import Schedule from './pages/Schedule'
import Money from './pages/Money'
import Reminders from './pages/Reminders'
import PermissionsAdmin from './pages/PermissionsAdmin'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <ToastContainer />
          <Routes>
            {/* Public routes */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
            <Route path="/money" element={<ProtectedRoute><Money /></ProtectedRoute>} />
            <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
            <Route path="/admin/permissions" element={<ProtectedRoute><PermissionsAdmin /></ProtectedRoute>} />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
