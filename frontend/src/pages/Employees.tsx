import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    strength: 'normal' as 'strong' | 'normal' | 'new',
    active: true,
    availability: [] as string[]
  })

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees/')
      setEmployees(response.data)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/employees/', formData)
      setShowForm(false)
      setFormData({ full_name: '', role: '', strength: 'normal', active: true, availability: [] })
      fetchEmployees()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create employee')
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(day) 
        ? prev.availability.filter(d => d !== day)
        : [...prev.availability, day]
    }))
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
            Add Employee
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Full Name" required value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 border rounded" />
              <input placeholder="Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border rounded" />
              <select value={formData.strength} onChange={(e) => setFormData({...formData, strength: e.target.value as any})} className="w-full px-4 py-2 border rounded">
                <option value="strong">Strong</option>
                <option value="normal">Normal</option>
                <option value="new">New</option>
              </select>
              <div>
                <p className="font-medium mb-2">Availability:</p>
                <div className="flex gap-2">
                  {days.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-2 rounded ${formData.availability.includes(day) ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
                    >
                      {day.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded">Create Employee</button>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold">{emp.full_name}</h3>
                  <p className="text-gray-600">{emp.role}</p>
                  <p className="text-sm mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${emp.strength === 'strong' ? 'bg-green-100 text-green-800' : emp.strength === 'new' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}>
                      {emp.strength.toUpperCase()}
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${emp.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {emp.active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                  <p className="text-sm mt-2 text-gray-600">Available: {emp.availability.map((d: string) => d.toUpperCase()).join(', ') || 'None'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
