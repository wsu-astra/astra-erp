import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'inventory' as 'inventory' | 'payroll' | 'schedule',
    day_of_week: 'mon',
    time_of_day: '09:00',
    message: '',
    active: true
  })

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    try {
      const response = await api.get('/api/reminders/')
      setReminders(response.data)
    } catch (error) {
      console.error('Failed to fetch reminders:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/reminders/', formData)
      setShowForm(false)
      setFormData({ type: 'inventory', day_of_week: 'mon', time_of_day: '09:00', message: '', active: true })
      fetchReminders()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create reminder')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this reminder?')) return
    try {
      await api.delete(`/api/reminders/${id}`)
      fetchReminders()
    } catch (error) {
      alert('Failed to delete reminder')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Reminders</h1>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gray-900 text-white rounded-lg">
            Add Reminder
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <form onSubmit={handleSubmit} className="space-y-4">
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as any})} className="w-full px-4 py-2 border rounded">
                <option value="inventory">Inventory</option>
                <option value="payroll">Payroll</option>
                <option value="schedule">Schedule</option>
              </select>
              <select value={formData.day_of_week} onChange={(e) => setFormData({...formData, day_of_week: e.target.value})} className="w-full px-4 py-2 border rounded">
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                  <option key={day} value={day}>{day.toUpperCase()}</option>
                ))}
              </select>
              <input type="time" value={formData.time_of_day} onChange={(e) => setFormData({...formData, time_of_day: e.target.value})} className="w-full px-4 py-2 border rounded" />
              <textarea placeholder="Reminder Message" required value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-2 border rounded" rows={3} />
              <button type="submit" className="w-full bg-primary-600 text-white py-2 rounded">Create Reminder</button>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white p-6 rounded-lg shadow flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded">{reminder.type.toUpperCase()}</span>
                  <span className="text-sm text-gray-600">{reminder.day_of_week.toUpperCase()} at {reminder.time_of_day}</span>
                  {!reminder.active && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Inactive</span>}
                </div>
                <p className="text-gray-900">{reminder.message}</p>
              </div>
              <button onClick={() => handleDelete(reminder.id)} className="text-red-600 hover:text-red-700">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
