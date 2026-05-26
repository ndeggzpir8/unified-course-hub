'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BrowseCoursesPage() {
  const [courses, setCourses] = useState([])
  const [enrolledIds, setEnrolledIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [{ data: coursesData }, { data: enrollmentsData }] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('enrollments').select('course_id').eq('student_id', session.user.id)
      ])

      setCourses(coursesData || [])
      setEnrolledIds(enrollmentsData?.map(e => e.course_id) || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleEnroll = async (courseId) => {
    setEnrolling(courseId)
    const { data: { session } } = await supabase.auth.getSession()

    const { error } = await supabase
      .from('enrollments')
      .insert({ student_id: session.user.id, course_id: courseId })

    if (!error) {
      setEnrolledIds([...enrolledIds, courseId])
    }
    setEnrolling(null)
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
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Browse courses</h2>
          <p className="text-sm text-gray-500 mt-1">Enroll in a course to access its materials and announcements</p>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-sm">No courses available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(course => {
              const enrolled = enrolledIds.includes(course.id)
              return (
                <div key={course.id} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      {course.code}
                    </span>
                    <h3 className="text-gray-900 font-medium mt-3">{course.title}</h3>
                  </div>
                  {enrolled ? (
                    <Link
                      href={`/courses/${course.id}`}
                      className="text-center text-sm text-green-600 bg-green-50 border border-green-200 px-4 py-2 rounded-lg font-medium hover:bg-green-100 transition-colors"
                    >
                      ✓ Enrolled — View course
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}