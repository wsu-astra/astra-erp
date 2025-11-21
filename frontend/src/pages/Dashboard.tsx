import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { Package, Users, Calendar, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
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
      </div>
    </Layout>
  )
}
