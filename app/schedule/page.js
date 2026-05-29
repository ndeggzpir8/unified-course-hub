'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const START_HOUR = 7
const END_HOUR = 21
const HOUR_HEIGHT = 64

const timeToHours = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours + minutes / 60
}

const formatHour = (hour) => {
  const h = hour % 12 || 12
  return `${h}${hour < 12 ? 'am' : 'pm'}`
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([])
  const [courseColorMap, setCourseColorMap] = useState({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = hours.length * HOUR_HEIGHT

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      let scheduleData = []

      if (profileData.role === 'lecturer') {
        const { data } = await supabase
          .from('schedule')
          .select('*, courses(title, code)')
          .order('start_time')
        scheduleData = data || []
      } else {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', session.user.id)

        const courseIds = enrollments?.map(e => e.course_id) || []

        if (courseIds.length > 0) {
          const { data } = await supabase
            .from('schedule')
            .select('*, courses(title, code)')
            .in('course_id', courseIds)
            .order('start_time')
          scheduleData = data || []
        }
      }

      const colorMap = {}
      let colorIndex = 0
      scheduleData.forEach(s => {
        if (!colorMap[s.course_id]) {
          colorMap[s.course_id] = COLORS[colorIndex % COLORS.length]
          colorIndex++
        }
      })

      setSchedule(scheduleData)
      setCourseColorMap(colorMap)
      setLoading(false)
    }
    init()
  }, [])

  const getScheduleForDay = (day) => schedule.filter(s => s.day === day)

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Course Hub</h1>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100 px-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          <Link href="/dashboard" className="text-sm py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-900 transition-colors">
            Courses
          </Link>
          <Link href="/schedule" className="text-sm py-3 border-b-2 border-blue-600 text-blue-600 font-medium">
            Schedule
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Weekly Schedule</h2>
          <p className="text-sm text-gray-500 mt-1">All your classes across all courses</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">

              {/* Day headers */}
              <div className="flex border-b border-gray-200">
                <div className="w-16 flex-shrink-0" />
                {DAYS.map(day => (
                  <div key={day} className="flex-1 text-center py-3 text-sm font-medium text-gray-700 border-l border-gray-100">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="flex">

                {/* Time labels */}
                <div className="w-16 flex-shrink-0">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      style={{ height: HOUR_HEIGHT }}
                      className="flex items-start justify-end pr-2 pt-1"
                    >
                      <span className="text-xs text-gray-400">{formatHour(hour)}</span>
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {DAYS.map(day => (
                  <div
                    key={day}
                    className="flex-1 relative border-l border-gray-100"
                    style={{ height: totalHeight }}
                  >
                    {/* Hour grid lines */}
                    {hours.map(hour => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-gray-100"
                        style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Course blocks */}
                    {getScheduleForDay(day).map(s => {
                      const top = (timeToHours(s.start_time) - START_HOUR) * HOUR_HEIGHT
                      const height = (timeToHours(s.end_time) - timeToHours(s.start_time)) * HOUR_HEIGHT
                      const color = courseColorMap[s.course_id] || COLORS[0]
                      return (
                        <div
                          key={s.id}
                          className={`absolute inset-x-1 rounded-lg p-2 border ${color.bg} ${color.text} ${color.border} overflow-hidden`}
                          style={{ top: top + 1, height: height - 2 }}
                        >
                          <p className="text-xs font-semibold truncate">{s.courses?.code}</p>
                          <p className="text-xs truncate opacity-80">{s.courses?.title}</p>
                          {s.location && (
                            <p className="text-xs truncate opacity-60 mt-0.5">{s.location}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}