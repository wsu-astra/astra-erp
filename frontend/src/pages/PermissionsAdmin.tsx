import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import { UserCog } from 'lucide-react'
import { showToast } from '../components/Toast'

interface Employee {
  user_id: string
  full_name: string
  email: string
  is_admin: boolean
  is_active: boolean
}

export default function PermissionsAdmin() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees/profiles')
      setEmployees(response.data)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const handleAdminToggle = async (userId: string, isAdminStatus: boolean) => {
    try {
      console.log('[ADMIN_TOGGLE] Updating user:', userId, 'to is_admin:', isAdminStatus)
      const response = await api.put(`/api/employees/profiles/${userId}/admin`, { is_admin: isAdminStatus })
      console.log('[ADMIN_TOGGLE] Response:', response.data)
      
      await fetchEmployees()
      console.log('[ADMIN_TOGGLE] Employees refreshed')
      
      showToast(`User is now ${isAdminStatus ? 'an Admin' : 'an Employee'}`, 'success')
    } catch (error: any) {
      console.error('[ADMIN_TOGGLE] Error:', error)
      showToast(error.response?.data?.detail || 'Failed to update admin status', 'error')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <UserCog className="w-8 h-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Manage Access</h1>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Level
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((emp) => (
                <tr key={emp.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{emp.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isAdmin ? (
                      <select
                        value={emp.is_admin ? 'admin' : 'employee'}
                        onChange={(e) => handleAdminToggle(emp.user_id, e.target.value === 'admin')}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        emp.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {emp.is_admin ? 'Admin' : 'Employee'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
