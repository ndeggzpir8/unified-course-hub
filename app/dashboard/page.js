'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const getTodayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[new Date().getDay()]
}

const getCurrentTime = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const getUpcomingClasses = (schedule) => {
  const today = getTodayName()
  const now = getCurrentTime()
  const todayIndex = DAY_ORDER.indexOf(today)

  // Classes later today, then rest of week, then wrap to start of week
  const ranked = schedule
    .map(s => {
      const dayIndex = DAY_ORDER.indexOf(s.day)
      if (dayIndex === -1) return { ...s, rank: 999 } // weekend fallback
      if (dayIndex === todayIndex && s.start_time > now) return { ...s, rank: 0 }
      if (dayIndex > todayIndex) return { ...s, rank: dayIndex - todayIndex }
      return { ...s, rank: dayIndex + 5 - todayIndex } // wraps to next week
    })
    .sort((a, b) => a.rank - b.rank || a.start_time.localeCompare(b.start_time))

  return ranked.slice(0, 3)
}

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [upcomingClasses, setUpcomingClasses] = useState([])
  const [recentAnnouncements, setRecentAnnouncements] = useState([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, departments(name)')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      let courseIds = []
      let coursesData = []

      if (profileData.role === 'lecturer') {
        const { data } = await supabase
          .from('courses')
          .select('*')
          .eq('lecturer_id', user.id)
        coursesData = data || []
        courseIds = coursesData.map(c => c.id)
      } else {
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('course_id, courses(*)')
          .eq('student_id', user.id)
        coursesData = enrollmentsData?.map(e => e.courses) || []
        courseIds = coursesData.map(c => c.id)
      }

      setCourses(coursesData)

      if (courseIds.length > 0) {
        const [{ data: scheduleData }, { data: announcementsData }, { data: assignmentsData }] = await Promise.all([
          supabase
            .from('schedule')
            .select('*, courses(title, code)')
            .in('course_id', courseIds),
          supabase
            .from('announcements')
            .select('*, courses(title, code)')
            .in('course_id', courseIds)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('assignments')
            .select('*, courses(title, code)')
            .in('course_id', courseIds)
            .gte('due_date', new Date().toISOString())
            .order('due_date', { ascending: true })
            .limit(5)
        ])

        setUpcomingClasses(getUpcomingClasses(scheduleData || []))
        setRecentAnnouncements(announcementsData || [])
        setUpcomingDeadlines(assignmentsData || [])
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteCourse = async (course) => {
    if (!confirm(`Delete "${course.title}"? This will remove all its materials, announcements, and schedule entries.`)) return
    await Promise.all([
      supabase.from('schedule').delete().eq('course_id', course.id),
      supabase.from('announcements').delete().eq('course_id', course.id),
      supabase.from('enrollments').delete().eq('course_id', course.id),
      supabase.from('materials').delete().eq('course_id', course.id),
    ])
    await supabase.from('courses').delete().eq('id', course.id)
    setCourses(courses.filter(c => c.id !== course.id))
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  )

  const today = getTodayName()
  const classesToday = upcomingClasses.filter(s => s.day === today).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 border-t-2 border-t-amber-400 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">Course Hub</Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Hi, {profile?.full_name}</span>
              {profile?.departments?.name && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                  {profile.departments.name}
                </span>
              )}
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-100 px-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          <Link href="/dashboard" className="text-sm py-3 border-b-2 border-blue-600 text-blue-600 font-medium">
            Courses
          </Link>
          <Link href="/schedule" className="text-sm py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-900 transition-colors">
            Schedule
          </Link>
          {profile?.role === 'admin' && (
            <Link href="/admin" className="text-sm py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-900 transition-colors">
              Admin Panel
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">{profile?.role === 'lecturer' ? 'Courses teaching' : 'Courses enrolled'}</p>
            <p className="text-2xl font-semibold text-gray-900">{courses.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Classes today</p>
            <p className="text-2xl font-semibold text-gray-900">{classesToday}</p>
            <p className="text-xs text-gray-400 mt-1">{today}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Upcoming deadlines</p>
            <p className="text-2xl font-semibold text-gray-900">{upcomingDeadlines.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Recent announcements</p>
            <p className="text-2xl font-semibold text-gray-900">{recentAnnouncements.length}</p>
          </div>
        </div>

        {/* Upcoming classes + Recent announcements */}
        {courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Upcoming classes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Upcoming classes</h3>
                <Link href="/schedule" className="text-xs text-blue-600 hover:underline">View schedule</Link>
              </div>
              <div className="space-y-3">
                {upcomingClasses.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className="text-sm text-gray-400">No upcoming classes</p>
                  </div>
                ) : (
                  upcomingClasses.map(s => (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{s.courses?.code}</span>
                        {s.day === today && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Today</span>}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{s.courses?.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.day} · {s.start_time} – {s.end_time}</p>
                      {s.location && <p className="text-xs text-gray-400 mt-0.5">{s.location}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming deadlines */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Upcoming deadlines</h3>
              <div className="space-y-3">
                {upcomingDeadlines.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className="text-sm text-gray-400">No upcoming deadlines</p>
                  </div>
                ) : (
                  upcomingDeadlines.map(a => {
                    const due = new Date(a.due_date)
                    const diffDays = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24))
                    const isUrgent = diffDays <= 3
                    return (
                      <Link key={a.id} href={`/courses/${a.course_id}?tab=${a.type === 'cat' ? 'schedule' : 'assignments'}`}>
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 transition-colors cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.type === 'cat' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {a.type === 'cat' ? 'CAT' : 'Assignment'}
                            </span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{a.courses?.code}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{a.title}</p>
                          <p className={`text-xs mt-0.5 ${isUrgent ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                            Due {due.toLocaleDateString('en-KE', { dateStyle: 'medium' })} · {due.toLocaleTimeString('en-KE', { timeStyle: 'short' })}
                          </p>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>

            {/* Recent announcements */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent announcements</h3>
              <div className="space-y-3">
                {recentAnnouncements.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                    <p className="text-sm text-gray-400">No announcements yet</p>
                  </div>
                ) : (
                  recentAnnouncements.map(a => (
                    <Link key={a.id} href={`/courses/${a.course_id}`}>
                      <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{a.courses?.code}</span>
                          <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{a.title}</p>
                        {a.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.body}</p>}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Courses section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
                {profile?.role === 'lecturer' ? 'My Courses' : 'Enrolled Courses'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {profile?.role === 'lecturer' ? 'Courses you are teaching' : 'Courses you are enrolled in'}
              </p>
            </div>
            {profile?.role === 'lecturer' ? (
              <Link href="/courses/new" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                + New course
              </Link>
            ) : (
              <Link href="/courses/browse" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Browse courses
              </Link>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-sm">
                {profile?.role === 'lecturer' ? 'No courses yet. Create your first one.' : 'You are not enrolled in any courses yet.'}
              </p>
              {profile?.role === 'student' && (
                <Link href="/courses/browse" className="mt-4 inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Browse courses
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all">
                  <Link href={`/courses/${course.id}`} className="block">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      {course.code}
                    </span>
                    <h3 className="text-gray-900 font-medium mt-3">{course.title}</h3>
                  </Link>
                  {profile?.role === 'lecturer' && (
                    <button
                      onClick={() => handleDeleteCourse(course)}
                      className="mt-4 text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Delete course
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}