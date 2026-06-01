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

const getDayName = (dateStr) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date(dateStr).getDay()]
}

const getWeekDates = () => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  return DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([])
  const [assignments, setAssignments] = useState([])
  const [courseColorMap, setCourseColorMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [showClasses, setShowClasses] = useState(true)
  const [showAssignments, setShowAssignments] = useState(true)
  const router = useRouter()

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const totalHeight = hours.length * HOUR_HEIGHT
  const weekDates = getWeekDates()

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
      let assignmentsData = []

      if (profileData.role === 'lecturer') {
        const { data: lecturerCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('lecturer_id', session.user.id)

        const courseIds = lecturerCourses?.map(c => c.id) || []

        if (courseIds.length > 0) {
          const [{ data: sched }, { data: assign }] = await Promise.all([
            supabase.from('schedule').select('*, courses(title, code)').in('course_id', courseIds).order('start_time'),
            supabase.from('assignments').select('*, courses(title, code)').in('course_id', courseIds).order('due_date')
          ])
          scheduleData = sched || []
          assignmentsData = assign || []
        }
      } else {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', session.user.id)

        const courseIds = enrollments?.map(e => e.course_id) || []

        if (courseIds.length > 0) {
          const [{ data: sched }, { data: assign }] = await Promise.all([
            supabase.from('schedule').select('*, courses(title, code)').in('course_id', courseIds).order('start_time'),
            supabase.from('assignments').select('*, courses(title, code)').in('course_id', courseIds).order('due_date')
          ])
          scheduleData = sched || []
          assignmentsData = assign || []
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
      assignmentsData.forEach(a => {
        if (!colorMap[a.course_id]) {
          colorMap[a.course_id] = COLORS[colorIndex % COLORS.length]
          colorIndex++
        }
      })

      setSchedule(scheduleData)
      setAssignments(assignmentsData)
      setCourseColorMap(colorMap)
      setLoading(false)
    }
    init()
  }, [])

  const getScheduleForDay = (day) => schedule.filter(s => s.day === day)

  const getAssignmentsForDay = (dayIndex) => {
    const date = weekDates[dayIndex]
    return assignments.filter(a => {
      const aDate = new Date(a.due_date)
      return (
        aDate.getFullYear() === date.getFullYear() &&
        aDate.getMonth() === date.getMonth() &&
        aDate.getDate() === date.getDate()
      )
    })
  }

  const today = new Date()
  const isToday = (dayIndex) => {
    const d = weekDates[dayIndex]
    return d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 border-t-2 border-t-amber-400 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">Course Hub</Link>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Weekly Schedule</h2>
            <p className="text-sm text-gray-500 mt-1">All your classes and deadlines this week</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowClasses(!showClasses)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${showClasses ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}`}
            >
              Classes
            </button>
            <button
              onClick={() => setShowAssignments(!showAssignments)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${showAssignments ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-300'}`}
            >
              Deadlines
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">

              {/* Day headers */}
              <div className="flex border-b border-gray-200">
                <div className="w-16 flex-shrink-0" />
                {DAYS.map((day, i) => (
                  <div key={day} className={`flex-1 text-center py-3 border-l border-gray-100 ${isToday(i) ? 'bg-blue-50' : ''}`}>
                    <p className={`text-sm font-medium ${isToday(i) ? 'text-blue-600' : 'text-gray-700'}`}>{day}</p>
                    <p className={`text-xs mt-0.5 ${isToday(i) ? 'text-blue-400' : 'text-gray-400'}`}>
                      {weekDates[i].toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Deadline banner row */}
              {showAssignments && (
                <div className="flex border-b border-gray-200 bg-gray-50">
                  <div className="w-16 flex-shrink-0 flex items-center justify-end pr-2">
                    <span className="text-xs text-gray-400">due</span>
                  </div>
                  {DAYS.map((day, i) => {
                    const dayAssignments = getAssignmentsForDay(i)
                    return (
                      <div key={day} className={`flex-1 border-l border-gray-100 p-1 min-h-8 ${isToday(i) ? 'bg-blue-50' : ''}`}>
                        {dayAssignments.map(a => (
                          <Link key={a.id} href={`/courses/${a.course_id}?tab=${a.type === 'cat' ? 'schedule' : 'assignments'}`}>
                            <div className={`text-xs px-2 py-1 rounded-md mb-1 truncate cursor-pointer hover:opacity-80 ${a.type === 'cat' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              <span className="font-medium">{a.type === 'cat' ? 'CAT' : 'Asgn'}</span> · {a.courses?.code} · {a.title}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Calendar grid */}
              <div className="flex">
                <div className="w-16 flex-shrink-0">
                  {hours.map(hour => (
                    <div key={hour} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-end pr-2 pt-1">
                      <span className="text-xs text-gray-400">{formatHour(hour)}</span>
                    </div>
                  ))}
                </div>

                {DAYS.map((day, i) => (
                  <div key={day} className={`flex-1 relative border-l border-gray-100 ${isToday(i) ? 'bg-blue-50' : ''}`} style={{ height: totalHeight }}>
                    {hours.map(hour => (
                      <div key={hour} className="absolute w-full border-t border-gray-100" style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }} />
                    ))}

                    {showClasses && getScheduleForDay(day).map(s => {
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
                          {s.location && <p className="text-xs truncate opacity-60 mt-0.5">{s.location}</p>}
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