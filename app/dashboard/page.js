'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      if (profileData.role === 'lecturer') {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('lecturer_id', user.id)
        setCourses(coursesData || [])
      } else {
        const { data: enrollmentsData } = await supabase
          .from('enrollments')
          .select('course_id, courses(*)')
          .eq('student_id', user.id)
        setCourses(enrollmentsData?.map(e => e.courses) || [])
      }

      setLoading(false)
    }

    init()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hi, {profile?.full_name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
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
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {profile?.role === 'lecturer' ? 'My Courses' : 'Enrolled Courses'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {profile?.role === 'lecturer'
                ? 'Courses you are teaching'
                : 'Courses you are enrolled in'}
            </p>
          </div>
          {profile?.role === 'lecturer' && (
            <Link
              href="/courses/new"
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + New course
            </Link>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-sm">
              {profile?.role === 'lecturer'
                ? 'No courses yet. Create your first one.'
                : 'You are not enrolled in any courses yet.'}
            </p>
            {profile?.role === 'student' && (
              <Link
                href="/courses/browse"
                className="mt-4 inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Browse courses
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {course.code}
                  </span>
                  <h3 className="text-gray-900 font-medium mt-3">{course.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}