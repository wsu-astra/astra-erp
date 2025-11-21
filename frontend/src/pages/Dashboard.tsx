import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { Package, Users, Calendar, AlertCircle, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { showToast } from '../components/Toast'

export default function Dashboard() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const defaultDayHours = { open_time: '09:00', close_time: '17:00', closed: false }
  const [storeHours, setStoreHours] = useState({
    sunday: { ...defaultDayHours, closed: true },
    monday: defaultDayHours,
    tuesday: defaultDayHours,
    wednesday: defaultDayHours,
    thursday: defaultDayHours,
    friday: defaultDayHours,
    saturday: defaultDayHours
  })
  const [showHoursModal, setShowHoursModal] = useState(false)
  const [editingHours, setEditingHours] = useState(storeHours)

  useEffect(() => {
    fetchStats()
    if (isAdmin) {
      fetchStoreHours()
    }
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStoreHours = async () => {
    try {
      const response = await api.get('/api/business/store-hours')
      // Ensure days are in the correct order: Sunday -> Saturday
      const orderedHours = {
        monday: response.data.monday,
        tuesday: response.data.tuesday,
        wednesday: response.data.wednesday,
        thursday: response.data.thursday,
        friday: response.data.friday,
        saturday: response.data.saturday,
        sunday: response.data.sunday
      }
      setStoreHours(orderedHours)
      setEditingHours(orderedHours)
    } catch (error) {
      console.error('Failed to fetch store hours:', error)
    }
  }

  const saveStoreHours = async () => {
    try {
      await api.put('/api/business/store-hours', editingHours)
      setStoreHours(editingHours)
      setShowHoursModal(false)
      showToast('Store hours updated successfully!', 'success')
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to update store hours', 'error')
    }
  }

  const updateDayHours = (day: string, field: string, value: any) => {
    setEditingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        [field]: value
      }
    }))
  }

  const formatTime = (time: string) => {
    if (!time || typeof time !== 'string') return '9:00 AM'
    
    const [hour, minute] = time.split(':')
    if (!hour || !minute) return '9:00 AM'
    
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${hour12}:${minute} ${ampm}`
  }

  if (loading) return <Layout><div>Loading...</div></Layout>

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inventory Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_inventory_items || 0}</p>
                <p className="text-sm text-red-600 mt-1">{stats?.out_of_stock_count || 0} out of stock</p>
              </div>
              <Package className="text-primary-500" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Employees</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.active_employees || 0}</p>
                <p className="text-sm text-gray-500 mt-1">of {stats?.total_employees || 0} total</p>
              </div>
              <Users className="text-primary-500" size={40} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming Shifts</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.upcoming_shifts || 0}</p>
                <p className="text-sm text-gray-500 mt-1">next 7 days</p>
              </div>
              <Calendar className="text-primary-500" size={40} />
            </div>
          </div>
        </div>

        {/* Store Hours - Admin Only */}
        {isAdmin && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="mr-2" size={24} />
                Store Hours
              </h2>
              <button
                onClick={() => setShowHoursModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Hours
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(storeHours).map(([day, hours]: [string, any]) => (
                <div key={day} className="text-sm">
                  <div className="font-medium text-gray-900 capitalize">{day}</div>
                  {hours.closed ? (
                    <div className="text-gray-500">Closed</div>
                  ) : (
                    <div className="text-gray-600">
                      {formatTime(hours.open_time)} - {formatTime(hours.close_time)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Reminders */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="mr-2" size={24} />
            Today's Reminders
          </h2>
          {stats?.todays_reminders && stats.todays_reminders.length > 0 ? (
            <div className="space-y-2">
              {stats.todays_reminders.map((reminder: any) => (
                <div key={reminder.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-medium text-gray-900">{reminder.message}</p>
                  <p className="text-sm text-gray-600">Time: {reminder.time_of_day} | Type: {reminder.type}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No reminders for today</p>
          )}
        </div>

        {/* Store Hours Modal */}
        {showHoursModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Update Store Hours</h2>
              
              <div className="space-y-4">
                {Object.entries(editingHours).map(([day, hours]: [string, any]) => (
                  <div key={day} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 capitalize">{day}</h3>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) => updateDayHours(day, 'closed', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">Closed</span>
                      </label>
                    </div>
                    
                    {!hours.closed && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Open
                          </label>
                          <input
                            type="time"
                            value={hours.open_time}
                            onChange={(e) => updateDayHours(day, 'open_time', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(hours.open_time)}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Close
                          </label>
                          <input
                            type="time"
                            value={hours.close_time}
                            onChange={(e) => updateDayHours(day, 'close_time', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(hours.close_time)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowHoursModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStoreHours}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Hours
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
