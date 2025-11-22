import { useEffect, useState } from 'react'
import { Layout } from '../components/Layout'
import api from '../lib/api'
import { format, startOfWeek, addWeeks, addDays } from 'date-fns'
import { Calendar, MessageSquare, Plus, Trash2, Copy } from 'lucide-react'
import { WeeklyAvailabilityCalendar } from '../components/WeeklyAvailabilityCalendar'
import { Modal, ConfirmDialog } from '../components/Modal'
import { showToast } from '../components/Toast'

export default function Schedule() {
  const [shifts, setShifts] = useState<any[]>([])
  const getCurrentWeekStart = () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart())
  const [showAvailabilityCalendar, setShowAvailabilityCalendar] = useState(false)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [showShiftSlotsModal, setShowShiftSlotsModal] = useState(false)
  const [showAddSlotModal, setShowAddSlotModal] = useState(false)
  const [showCopySlotModal, setShowCopySlotModal] = useState(false)
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [showClearScheduleConfirm, setShowClearScheduleConfirm] = useState(false)
  const [showDeleteSlotConfirm, setShowDeleteSlotConfirm] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiPreferences, setAiPreferences] = useState('')
  const [shiftSlots, setShiftSlots] = useState<any[]>([])
  const [currentDay, setCurrentDay] = useState<string>('')
  const [selectedDaysToCopy, setSelectedDaysToCopy] = useState<string[]>([])
  const [slotToCopy, setSlotToCopy] = useState<any>(null)
  const [newSlot, setNewSlot] = useState({
    slot_name: '',
    start_time: '',
    end_time: '',
    required_count: 1
  })

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

  useEffect(() => {
    fetchShifts()
    fetchShiftSlots()
  }, [weekStart])

  const fetchShifts = async () => {
    try {
      const response = await api.get(`/api/schedule/shifts/${weekStart}`)
      setShifts(response.data)
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    }
  }

  const fetchShiftSlots = async () => {
    try {
      const response = await api.get('/api/schedule/shift-slots')
      setShiftSlots(response.data)
    } catch (error) {
      console.error('Failed to fetch shift slots:', error)
    }
  }


  const generateSchedule = async () => {
    setIsGenerating(true)
    setShowGenerateConfirm(false)
    
    console.log('[SCHEDULE_GENERATE] Sending request with preferences:', aiPreferences)
    
    try {
      await api.post('/api/schedule/generate', { 
        week_start: weekStart,
        preferences: aiPreferences 
      })
      showToast('Schedule generated successfully!', 'success')
      await fetchShifts()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to generate schedule'
      showToast(message, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const clearSchedule = async () => {
    setShowClearScheduleConfirm(false)
    try {
      await api.delete(`/api/schedule/shifts/${weekStart}`)
      showToast('Schedule cleared successfully!', 'success')
      await fetchShifts()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to clear schedule'
      showToast(message, 'error')
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

  const goToCurrentWeek = () => {
    setWeekStart(getCurrentWeekStart())
  }

  const isCurrentWeek = weekStart === getCurrentWeekStart()

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
          <div className="flex gap-3">
            <button 
              onClick={() => setShowAvailabilityCalendar(true)} 
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <Calendar className="w-4 h-4" />
              Set My Availability
            </button>
            <button 
              onClick={() => setShowShiftSlotsModal(true)} 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Configure Shifts
            </button>
            <button 
              onClick={() => setShowPreferencesModal(true)} 
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              AI Preferences
            </button>
            <button 
              onClick={() => setShowGenerateConfirm(true)} 
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Generate AI Schedule
            </button>
            <button 
              onClick={() => setShowClearScheduleConfirm(true)} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              disabled={shifts.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              Clear Schedule
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">← Prev Week</button>
          
          <div className="flex flex-col items-center">
            <span className="font-semibold text-lg text-gray-900">
              Week of {format(new Date(weekStart), 'MMM d')} - {format(addDays(new Date(weekStart), 6), 'MMM d, yyyy')}
            </span>
            {isCurrentWeek ? (
              <span className="text-sm text-green-600 font-medium">Current Week</span>
            ) : (
              <button
                onClick={goToCurrentWeek}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Go to Current Week
              </button>
            )}
          </div>

          <button onClick={nextWeek} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Next Week →</button>
        </div>

        {/* Schedule Calendar - Using same layout as availability calendar */}
        <div className="grid grid-cols-7 gap-3">
          {Object.entries(grouped).map(([day, dayShifts]: [string, any]) => {
            const dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
            const today = new Date()
            const weekStartDate = new Date(weekStart)
            const dayIndex = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day)
            const currentDayDate = new Date(weekStartDate)
            currentDayDate.setDate(weekStartDate.getDate() + dayIndex)
            const isToday = currentDayDate.toDateString() === today.toDateString()

            return (
              <div key={day} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Day Header - Fixed Height */}
                <div className={`p-3 text-center border-b ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="font-semibold text-sm text-gray-900">
                    {dayNames[day as keyof typeof dayNames]}
                  </div>
                  <div className={`text-xs ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                    {currentDayDate.getMonth() + 1}/{currentDayDate.getDate()}
                  </div>
                </div>

                {/* Shifts Content - Dynamic Height */}
                <div className="p-3 min-h-[120px] max-h-[300px] overflow-y-auto">
                  {dayShifts.length > 0 ? (
                    <div className="space-y-2">
                      {dayShifts.map((shift: any) => {
                        const formatTime = (time: string) => {
                          const [hours, minutes] = time.split(':')
                          const hour = parseInt(hours)
                          const ampm = hour >= 12 ? 'PM' : 'AM'
                          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                          return `${displayHour}:${minutes} ${ampm}`
                        }
                        
                        const strengthBadge = shift.employee_strength === 'shiftleader' ? 'Lead' : 
                                            shift.employee_strength === 'new' ? 'New' : null
                        
                        return (
                          <div key={shift.id} className="p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs font-semibold text-gray-900">{shift.employee_name}</span>
                              {strengthBadge && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                  shift.employee_strength === 'shiftleader' ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {strengthBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-600">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center min-h-[120px]">
                      <p className="text-xs text-gray-500 text-center">No shifts scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>


      {/* AI Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Scheduling Preferences</h2>
            <p className="text-gray-600 mb-6">
              Give the AI specific instructions for scheduling. Examples: "Need a shift leader on Friday and Saturday", 
              "No new employees during busy weekends", "John prefers morning shifts", etc.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduling Instructions
                </label>
                <textarea
                  value={aiPreferences}
                  onChange={(e) => setAiPreferences(e.target.value)}
                  placeholder="Enter your scheduling preferences and requirements..."
                  className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none placeholder-gray-400"
                  rows={6}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">💡 Example Instructions:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• "Always schedule a shift leader on Friday and Saturday"</li>
                  <li>• "Don't schedule new employees on busy days (Friday-Sunday)"</li>
                  <li>• "Adam prefers morning shifts when possible"</li>
                  <li>• "Need at least 2 experienced staff on weekends"</li>
                  <li>• "Avoid scheduling the same person too many days in a row"</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPreferencesModal(false)
                  if (aiPreferences.trim()) {
                    showToast('AI preferences saved! They will be used in the next schedule generation.', 'success')
                  } else {
                    showToast('Preferences cleared.', 'info')
                  }
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Slots Configuration Modal */}
      {showShiftSlotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Configure Shift Time Slots</h2>
            <p className="text-gray-600 mb-6">
              Define the shift time slots for each day. The AI will use these when generating schedules.
            </p>
            
            <div className="space-y-6">
              {days.map(day => {
                const daySlots = shiftSlots.filter(s => s.day_of_week === day)
                const dayNames = { 
                  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', 
                  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' 
                }
                
                return (
                  <div key={day} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {dayNames[day as keyof typeof dayNames]}
                    </h3>
                    
                    {daySlots.length > 0 ? (
                      <div className="space-y-2">
                        {daySlots.map(slot => {
                          const formatTime = (time: string) => {
                            const [hours, minutes] = time.split(':')
                            const hour = parseInt(hours)
                            const ampm = hour >= 12 ? 'PM' : 'AM'
                            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                            return `${displayHour}:${minutes} ${ampm}`
                          }
                          
                          return (
                            <div key={slot.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div>
                                <span className="font-medium">{slot.slot_name}</span>
                                <span className="ml-3 text-gray-600">
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </span>
                                <span className="ml-3 text-sm text-gray-500">
                                  ({slot.required_count} {slot.required_count === 1 ? 'person' : 'people'})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setSlotToCopy(slot)
                                    setSelectedDaysToCopy([])
                                    setShowCopySlotModal(true)
                                  }}
                                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                                <button
                                  onClick={() => setShowDeleteSlotConfirm(slot.id)}
                                  className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No shifts configured for this day</p>
                    )}
                    
                    <button
                      onClick={() => {
                        setCurrentDay(day)
                        setNewSlot({
                          slot_name: '',
                          start_time: '',
                          end_time: '',
                          required_count: 1
                        })
                        setShowAddSlotModal(true)
                      }}
                      className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Shift Slot
                    </button>
                  </div>
                )
              })}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Shift slots define when employees can work. 
                The AI will assign employees to these time slots based on availability and requirements.
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowShiftSlotsModal(false)}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Slot Modal */}
      <Modal
        isOpen={showAddSlotModal}
        onClose={() => setShowAddSlotModal(false)}
        title={`Add Shift Slot for ${currentDay ? currentDay.charAt(0).toUpperCase() + currentDay.slice(1) : ''}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
            <input
              type="text"
              value={newSlot.slot_name}
              onChange={(e) => setNewSlot({...newSlot, slot_name: e.target.value})}
              placeholder="e.g., Morning, Evening"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <select
                value={newSlot.start_time}
                onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select time</option>
                {Array.from({length: 48}, (_, i) => {
                  const hour = Math.floor(i / 2)
                  const minute = i % 2 === 0 ? '00' : '30'
                  const time24 = `${hour.toString().padStart(2, '0')}:${minute}`
                  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                  const ampm = hour < 12 ? 'AM' : 'PM'
                  const displayTime = `${displayHour}:${minute} ${ampm}`
                  return <option key={time24} value={time24}>{displayTime}</option>
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <select
                value={newSlot.end_time}
                onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select time</option>
                {Array.from({length: 48}, (_, i) => {
                  const hour = Math.floor(i / 2)
                  const minute = i % 2 === 0 ? '00' : '30'
                  const time24 = `${hour.toString().padStart(2, '0')}:${minute}`
                  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                  const ampm = hour < 12 ? 'AM' : 'PM'
                  const displayTime = `${displayHour}:${minute} ${ampm}`
                  return <option key={time24} value={time24}>{displayTime}</option>
                })}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff Required</label>
            <input
              type="number"
              min="1"
              value={newSlot.required_count}
              onChange={(e) => setNewSlot({...newSlot, required_count: parseInt(e.target.value) || 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowAddSlotModal(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await api.post('/api/schedule/shift-slots', {
                    day_of_week: currentDay,
                    ...newSlot
                  })
                  fetchShiftSlots()
                  setShowAddSlotModal(false)
                  showToast('Shift slot added successfully!', 'success')
                } catch (error: any) {
                  showToast(error.response?.data?.message || 'Failed to create shift slot', 'error')
                }
              }}
              disabled={!newSlot.slot_name || !newSlot.start_time || !newSlot.end_time}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300"
            >
              Add Slot
            </button>
          </div>
        </div>
      </Modal>

      {/* Copy Shift Slot Modal */}
      <Modal
        isOpen={showCopySlotModal}
        onClose={() => setShowCopySlotModal(false)}
        title={`Copy Shift: ${slotToCopy?.slot_name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Copying from:</p>
            <p className="font-medium">{slotToCopy?.day_of_week?.toUpperCase()}</p>
            <p className="text-sm text-gray-600">
              {slotToCopy && (() => {
                const formatTime = (time: string) => {
                  const [hours, minutes] = time.split(':')
                  const hour = parseInt(hours)
                  const ampm = hour >= 12 ? 'PM' : 'AM'
                  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                  return `${displayHour}:${minutes} ${ampm}`
                }
                return `${formatTime(slotToCopy.start_time)} - ${formatTime(slotToCopy.end_time)}`
              })()}
            </p>
            <p className="text-sm text-gray-600">{slotToCopy?.required_count} staff required</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Copy to days:</label>
            <div className="space-y-2">
              {days.map(day => {
                const dayNames = { 
                  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', 
                  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' 
                }
                const isCurrentDay = day === slotToCopy?.day_of_week
                const hasExistingSlot = shiftSlots.some(s => 
                  s.day_of_week === day && 
                  s.slot_name === slotToCopy?.slot_name
                )
                
                return (
                  <label 
                    key={day} 
                    className={`flex items-center justify-between p-2 rounded border ${
                      isCurrentDay ? 'bg-gray-100 opacity-50' : 
                      hasExistingSlot ? 'bg-yellow-50 border-yellow-300' : 
                      'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDaysToCopy.includes(day)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDaysToCopy([...selectedDaysToCopy, day])
                          } else {
                            setSelectedDaysToCopy(selectedDaysToCopy.filter(d => d !== day))
                          }
                        }}
                        disabled={isCurrentDay}
                        className="mr-3"
                      />
                      <span className={isCurrentDay ? 'text-gray-400' : ''}>
                        {dayNames[day as keyof typeof dayNames]}
                      </span>
                    </div>
                    {isCurrentDay && <span className="text-xs text-gray-500">Current day</span>}
                    {hasExistingSlot && !isCurrentDay && <span className="text-xs text-yellow-700">Will replace existing</span>}
                  </label>
                )
              })}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowCopySlotModal(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  // Create the slot for each selected day
                  for (const day of selectedDaysToCopy) {
                    // Check if slot with same name exists for that day
                    const existingSlot = shiftSlots.find(s => 
                      s.day_of_week === day && 
                      s.slot_name === slotToCopy.slot_name
                    )
                    
                    if (existingSlot) {
                      // Update existing slot
                      await api.put(`/api/schedule/shift-slots/${existingSlot.id}`, {
                        start_time: slotToCopy.start_time,
                        end_time: slotToCopy.end_time,
                        required_count: slotToCopy.required_count
                      })
                    } else {
                      // Create new slot
                      await api.post('/api/schedule/shift-slots', {
                        day_of_week: day,
                        slot_name: slotToCopy.slot_name,
                        start_time: slotToCopy.start_time,
                        end_time: slotToCopy.end_time,
                        required_count: slotToCopy.required_count
                      })
                    }
                  }
                  
                  fetchShiftSlots()
                  setShowCopySlotModal(false)
                  showToast(`Shift copied to ${selectedDaysToCopy.length} day(s)`, 'success')
                } catch (error: any) {
                  showToast(error.response?.data?.message || 'Failed to copy shift slots', 'error')
                }
              }}
              disabled={selectedDaysToCopy.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
            >
              Copy to {selectedDaysToCopy.length} day{selectedDaysToCopy.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={showGenerateConfirm}
        onClose={() => setShowGenerateConfirm(false)}
        onConfirm={generateSchedule}
        title="Generate AI Schedule"
        message="This will generate an AI-powered schedule for the current week. Any existing shifts will be replaced. Continue?"
        confirmText="Generate"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={showClearScheduleConfirm}
        onClose={() => setShowClearScheduleConfirm(false)}
        onConfirm={clearSchedule}
        title="Clear Schedule?"
        message={`This will delete all shifts for the week of ${format(new Date(weekStart), 'MMM d')}. This action cannot be undone.`}
        confirmText="Clear Schedule"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteSlotConfirm !== null}
        onClose={() => setShowDeleteSlotConfirm(null)}
        onConfirm={async () => {
          if (showDeleteSlotConfirm) {
            try {
              await api.delete(`/api/schedule/shift-slots/${showDeleteSlotConfirm}`)
              fetchShiftSlots()
              showToast('Shift slot deleted', 'success')
            } catch (error) {
              showToast('Failed to delete shift slot', 'error')
            }
          }
          setShowDeleteSlotConfirm(null)
        }}
        title="Delete Shift Slot"
        message="Are you sure you want to delete this shift slot?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Weekly Availability Calendar */}
      <WeeklyAvailabilityCalendar
        isOpen={showAvailabilityCalendar}
        onClose={() => setShowAvailabilityCalendar(false)}
        onSave={() => {
          setShowAvailabilityCalendar(false)
          // Could refresh schedule data that depends on availability
        }}
      />

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Generating Schedule...</h3>
              <p className="text-gray-600 text-center">
                The AI is creating an optimal schedule based on your shift slots and employee availability.
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
