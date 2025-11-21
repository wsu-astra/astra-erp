import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { format, startOfWeek, addWeeks } from 'date-fns'

export default function Schedule() {
  const [shifts, setShifts] = useState<any[]>([])
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))

  useEffect(() => {
    fetchShifts()
  }, [weekStart])

  const fetchShifts = async () => {
    try {
      const response = await api.get(`/api/schedule/shifts/${weekStart}`)
      setShifts(response.data)
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    }
  }

  const generateSchedule = async () => {
    if (!confirm('Generate AI-powered schedule for this week?')) return
    try {
      await api.post('/api/schedule/generate', { week_start: weekStart })
      alert('Schedule generated!')
      fetchShifts()
    } catch (error: any) {
      alert(error.response?.data?.detail?.message || 'Failed to generate schedule')
    }
  }

  const nextWeek = () => {
    const next = format(addWeeks(new Date(weekStart), 1), 'yyyy-MM-dd')
    setWeekStart(next)
  }

  const prevWeek = () => {
    const prev = format(addWeeks(new Date(weekStart), -1), 'yyyy-MM-dd')
    setWeekStart(prev)
  }

  const groupByDay = () => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    const grouped: any = {}
    days.forEach(day => { grouped[day] = [] })
    shifts.forEach(shift => {
      if (grouped[shift.day_of_week]) {
        grouped[shift.day_of_week].push(shift)
      }
    })
    return grouped
  }

  const grouped = groupByDay()

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <button onClick={generateSchedule} className="px-4 py-2 bg-primary-600 text-white rounded-lg">
            Generate AI Schedule
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={prevWeek} className="px-4 py-2 bg-gray-200 rounded">← Prev Week</button>
          <span className="font-medium">Week of {weekStart}</span>
          <button onClick={nextWeek} className="px-4 py-2 bg-gray-200 rounded">Next Week →</button>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {Object.entries(grouped).map(([day, dayShifts]: [string, any]) => (
            <div key={day} className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold text-center mb-2">{day.toUpperCase()}</h3>
              <div className="space-y-2">
                {dayShifts.length > 0 ? dayShifts.map((shift: any) => (
                  <div key={shift.id} className="text-sm p-2 bg-primary-50 rounded">
                    <p className="font-medium">{shift.employee_name}</p>
                    <p className="text-xs text-gray-600">{shift.start_time} - {shift.end_time}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400 text-center">No shifts</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
