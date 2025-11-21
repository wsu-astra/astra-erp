import { useState, useEffect } from 'react'
import { format, startOfWeek, addDays, addWeeks, isSameDay } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, Clock, Check, X } from 'lucide-react'
import api from '../lib/api'
import { showToast } from './Toast'

interface WeeklyAvailabilityCalendarProps {
  isOpen: boolean
  onClose: () => void
  employeeId?: string
  onSave?: () => void
}

interface AvailabilityData {
  [date: string]: {
    available: boolean
  }
}

export function WeeklyAvailabilityCalendar({ 
  isOpen, 
  onClose, 
  employeeId,
  onSave 
}: WeeklyAvailabilityCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [availability, setAvailability] = useState<AvailabilityData>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i))
  const today = new Date()

  useEffect(() => {
    if (isOpen) {
      fetchWeeklyAvailability()
    }
  }, [isOpen, currentWeek, employeeId])

  const fetchWeeklyAvailability = async () => {
    try {
      setLoading(true)
      const weekStart = format(currentWeek, 'yyyy-MM-dd')
      console.log('Fetching availability for week:', weekStart)
      const response = await api.get(`/api/employees/availability/${weekStart}`)
      console.log('Availability response:', response.data)
      
      // Convert response to our format
      const availabilityMap: AvailabilityData = {}
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayData = response.data.find((a: any) => a.date === dateStr)
        
        // Use saved data if it exists, otherwise default to available (first time)
        availabilityMap[dateStr] = {
          available: dayData ? dayData.available : true
        }
      })
      
      setAvailability(availabilityMap)
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      // Default to available for the week
      const defaultAvailability: AvailabilityData = {}
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd')
        defaultAvailability[dateStr] = {
          available: true
        }
      })
      setAvailability(defaultAvailability)
    } finally {
      setLoading(false)
    }
  }

  const toggleDayAvailability = (dateStr: string) => {
    setAvailability(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        available: !prev[dateStr]?.available
      }
    }))
  }


  const saveAvailability = async () => {
    try {
      setSaving(true)
      const weekStart = format(currentWeek, 'yyyy-MM-dd')
      
      // Convert our format to API format
      const availabilityArray = Object.entries(availability).map(([date, data]) => ({
        date,
        available: data.available,
        start_time: '09:00',
        end_time: '17:00'
      }))

      console.log('Saving availability:', {
        week_start: weekStart,
        availability: availabilityArray
      })

      const response = await api.post('/api/employees/availability/bulk', {
        week_start: weekStart,
        availability: availabilityArray
      })

      console.log('Save response:', response.data)
      showToast('Availability saved successfully!', 'success')
      onSave?.()
      onClose()
    } catch (error: any) {
      console.error('Save error:', error)
      showToast(error.response?.data?.detail || 'Failed to save availability', 'error')
    } finally {
      setSaving(false)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addWeeks(prev, direction === 'next' ? 1 : -1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const setAllDaysAvailable = () => {
    const newAvailability: AvailabilityData = {}
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      newAvailability[dateStr] = {
        available: true
      }
    })
    setAvailability(newAvailability)
  }

  const clearAllDays = () => {
    const newAvailability: AvailabilityData = {}
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      newAvailability[dateStr] = {
        available: false
      }
    })
    setAvailability(newAvailability)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold text-gray-900">Weekly Availability</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Week
            </button>

            <div className="flex flex-col items-center">
              <span className="font-semibold text-lg">
                {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
              </span>
              <button
                onClick={goToCurrentWeek}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Go to Current Week
              </button>
            </div>

            <button
              onClick={() => navigateWeek('next')}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              Next Week
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={setAllDaysAvailable}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Available All Week
            </button>
            <button
              onClick={clearAllDays}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Mark All Days Off
            </button>
          </div>
        </div>

        {/* Calendar Grid - Simple Layout */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayData = availability[dateStr] || { available: true }
                const isToday = isSameDay(day, today)

                return (
                  <div key={dateStr} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Day Header - Fixed Height */}
                    <div className={`p-3 text-center border-b ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="font-semibold text-sm text-gray-900">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-xs ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                        {format(day, 'M/d')}
                      </div>
                    </div>

                    {/* Content - Simplified Height */}
                    <div className="p-3 h-16 flex flex-col justify-center">
                      {/* Toggle Button - Always same size */}
                      <button
                        onClick={() => toggleDayAvailability(dateStr)}
                        className={`w-full py-2 px-2 rounded text-xs font-medium transition-colors ${
                          dayData.available
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                        }`}
                      >
{dayData.available ? '✓ Available' : '✗ Day Off'}
                      </button>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Set your availability for the week of {format(currentWeek, 'MMM d, yyyy')}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={saveAvailability}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Availability'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}