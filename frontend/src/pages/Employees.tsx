import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { UserPlus, Copy, Check, Calendar } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { format, startOfWeek } from 'date-fns'
import { showToast } from '../components/Toast'

export default function Employees() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [employees, setEmployees] = useState<any[]>([])
  const [employeeAvailability, setEmployeeAvailability] = useState<any>({})
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteResult, setInviteResult] = useState<any>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    role: 'employee'
  })

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  useEffect(() => {
    fetchEmployees()
    if (isAdmin) {
      fetchTeamAvailability()
    }
  }, [])

  // Refresh availability when component becomes visible (when user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAdmin) {
        fetchTeamAvailability()
      }
    }
    
    const handleFocus = () => {
      if (isAdmin) {
        fetchTeamAvailability()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAdmin])

  const fetchEmployees = async () => {
    try {
      // Fetch from profiles table to get user accounts with strength data
      const response = await api.get('/api/employees/profiles')
      setEmployees(response.data)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const fetchTeamAvailability = async () => {
    try {
      const response = await api.get(`/api/employees/availability/overview/${currentWeekStart}`)
      const availabilityMap: any = {}
      response.data.forEach((emp: any) => {
        availabilityMap[emp.employee_id] = emp.availability
      })
      setEmployeeAvailability(availabilityMap)
    } catch (error) {
      console.error('Failed to fetch team availability:', error)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await api.post('/api/admin/invite', inviteData)
      setInviteResult(response.data)
      setInviteData({ email: '', full_name: '', role: 'employee' })
      fetchEmployees()
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to invite employee', 'error')
    }
  }

  const handleStrengthUpdate = async (userId: string, strength: string) => {
    try {
      console.log('[STRENGTH_UPDATE] Updating user:', userId, 'to strength:', strength)
      console.log('[STRENGTH_UPDATE] API URL:', `/api/employees/profiles/${userId}/strength`)
      console.log('[STRENGTH_UPDATE] Request payload:', { strength })
      
      const response = await api.put(`/api/employees/profiles/${userId}/strength`, { strength })
      console.log('[STRENGTH_UPDATE] Response:', response.data)
      
      await fetchEmployees()
      console.log('[STRENGTH_UPDATE] Employees refreshed')
      
      showToast(`Employee strength updated to ${strength}`, 'success')
    } catch (error: any) {
      console.error('[STRENGTH_UPDATE] Full error:', error)
      console.error('[STRENGTH_UPDATE] Error response:', error.response)
      console.error('[STRENGTH_UPDATE] Error data:', error.response?.data)
      
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update employee strength'
      showToast(errorMessage, 'error')
    }
  }

  const copyPassword = async () => {
    if (inviteResult?.temporary_password) {
      await navigator.clipboard.writeText(inviteResult.temporary_password)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  const closeInviteModal = () => {
    setShowInviteModal(false)
    setInviteResult(null)
    setCopiedPassword(false)
  }

  const renderAvailability = (employeeId: string) => {
    const availability = employeeAvailability[employeeId] || []
    
    // Filter to only show days where available=true
    const availableDays = availability
      .filter((a: any) => a.available === true)
      .map((a: any) => {
        const date = new Date(a.date)
        return date.toLocaleDateString('en', { weekday: 'short' })
      })
    
    if (availableDays.length === 0) {
      return (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          No availability set this week
        </div>
      )
    }

    return (
      <div className="mt-2">
        <div className="text-xs text-gray-600 flex items-center gap-1 mb-1">
          <Calendar className="w-3 h-3" />
          Available this week:
        </div>
        <div className="flex flex-wrap gap-1">
          {availableDays.map((day, index) => (
            <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              {day}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          {isAdmin && (
            <button 
              onClick={() => setShowInviteModal(true)} 
              className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 hover:bg-primary-700"
            >
              <UserPlus className="w-4 h-4" />
              Invite Employee
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> All employees must be invited via email to get login access. 
            Use the "Invite Employee" button above to add new team members.
          </p>
        </div>


        <div className="grid gap-4">
          {employees.filter(emp => !emp.is_admin).map((emp) => (
            <div key={emp.user_id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">{emp.full_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      emp.strength === 'shiftleader' ? 'bg-green-100 text-green-800' : 
                      emp.strength === 'new' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {emp.strength === 'shiftleader' ? 'Shift Leader' : 
                       emp.strength === 'new' ? 'New' : 'Normal'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mt-1">{emp.email}</p>
                  
                  {/* Show availability for admins */}
                  {isAdmin && renderAvailability(emp.user_id)}
                </div>
                
                {/* Strength Selector */}
                {isAdmin && (
                  <div className="ml-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Strength Level</label>
                    <select
                      value={emp.strength || 'normal'}
                      onChange={(e) => handleStrengthUpdate(emp.user_id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="new">New</option>
                      <option value="normal">Normal</option>
                      <option value="shiftleader">Shift Leader</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Invite Employee Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Invite Employee via Email</h2>
              
              {!inviteResult ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900">Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteData.email}
                      onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50"
                      placeholder="employee@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900">Full Name</label>
                    <input
                      type="text"
                      required
                      value={inviteData.full_name}
                      onChange={(e) => setInviteData({...inviteData, full_name: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50"
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-900">Role</label>
                    <select
                      value={inviteData.role}
                      onChange={(e) => setInviteData({...inviteData, role: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-gray-50"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Send Invite
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium mb-2">✅ Invitation Sent!</p>
                    <p className="text-sm text-green-700">
                      {inviteResult.full_name} has been invited to join your team.
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-900 font-medium mb-2">⚠️ Temporary Password</p>
                    <p className="text-sm text-yellow-800 mb-2">
                      Share this password with the employee. They should change it after first login.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded border border-yellow-300 font-mono text-sm text-gray-900">
                        {inviteResult.temporary_password}
                      </code>
                      <button
                        onClick={copyPassword}
                        className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-2"
                      >
                        {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedPassword ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-900 font-medium mb-1">📧 Login Credentials:</p>
                    <p className="text-sm text-blue-800">
                      <strong>Email:</strong> {inviteResult.email}<br />
                      <strong>Password:</strong> (shown above)
                    </p>
                  </div>
                  
                  <button
                    onClick={closeInviteModal}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
