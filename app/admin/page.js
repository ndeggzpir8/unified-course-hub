'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const [profile, setProfile] = useState(null)
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('departments')
  const [deptName, setDeptName] = useState('')
  const [deptCode, setDeptCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*, departments(name)')
        .eq('id', session.user.id)
        .single()

      if (profileData?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setProfile(profileData)

      const [{ data: deptsData }, { data: usersData }, { data: coursesData }] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('profiles').select('*, departments(name)').order('full_name'),
        supabase.from('courses').select('*, departments(name), profiles!lecturer_id(full_name)').order('created_at', { ascending: false })
      ])

      setDepartments(deptsData || [])
      setUsers(usersData || [])
      setCourses(coursesData || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleAddDepartment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data, error } = await supabase
      .from('departments')
      .insert({ name: deptName, code: deptCode.toUpperCase() })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setDepartments([...departments, data])
      setDeptName('')
      setDeptCode('')
    }
    setSaving(false)
  }

  const handleDeleteDepartment = async (dept) => {
    const assignedUsers = users.filter(u => u.department_id === dept.id).length
    const assignedCourses = courses.filter(c => c.department_id === dept.id).length

    if (assignedUsers > 0 || assignedCourses > 0) {
      alert(`Cannot delete "${dept.name}" — it has ${assignedUsers} user(s) and ${assignedCourses} course(s) assigned to it. Reassign them first.`)
      return
    }

    if (!confirm(`Delete department "${dept.name}"?`)) return

    await supabase.from('departments').delete().eq('id', dept.id)
    setDepartments(departments.filter(d => d.id !== dept.id))
  }

  const handleDeleteUser = async (user) => {
  if (!confirm(`Delete "${user.full_name}"? This will permanently remove their account and all related data.`)) return

  const { error } = await supabase.rpc('delete_user', { user_id: user.id })

  if (error) {
    alert(error.message)
    return
  }

  setUsers(users.filter(u => u.id !== user.id))
}

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tabClass = (tab) =>
    `text-sm py-3 border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'border-blue-600 text-blue-600 font-medium'
        : 'border-transparent text-gray-500 hover:text-gray-900'
    }`

  const roleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700',
      lecturer: 'bg-blue-100 text-blue-700',
      student: 'bg-gray-100 text-gray-600',
    }
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[role] || styles.student}`}>
        {role}
      </span>
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  )

  const studentCount = users.filter(u => u.role === 'student').length
  const lecturerCount = users.filter(u => u.role === 'lecturer').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Course Hub</h1>
            <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{profile?.full_name}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 px-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          <button className={tabClass('departments')} onClick={() => setActiveTab('departments')}>Departments</button>
          <button className={tabClass('users')} onClick={() => setActiveTab('users')}>Users</button>
          <button className={tabClass('courses')} onClick={() => setActiveTab('courses')}>Courses</button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Departments</p>
            <p className="text-2xl font-semibold text-gray-900">{departments.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Students</p>
            <p className="text-2xl font-semibold text-gray-900">{studentCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Lecturers</p>
            <p className="text-2xl font-semibold text-gray-900">{lecturerCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Courses</p>
            <p className="text-2xl font-semibold text-gray-900">{courses.length}</p>
          </div>
        </div>

        {/* Departments tab */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Add department</h3>
              <form onSubmit={handleAddDepartment} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Department name</label>
                  <input
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Computer Science"
                    required
                  />
                </div>
                <div className="w-36">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
                  <input
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    className={inputClass}
                    placeholder="e.g. CS"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
                >
                  {saving ? 'Adding...' : '+ Add'}
                </button>
              </form>
              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            </div>

            {departments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">No departments yet. Add one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {departments.map(dept => {
                  const deptUsers = users.filter(u => u.department_id === dept.id).length
                  const deptCourses = courses.filter(c => c.department_id === dept.id).length
                  return (
                    <div key={dept.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{dept.code}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{deptUsers} user{deptUsers !== 1 ? 's' : ''} · {deptCourses} course{deptCourses !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="text-sm text-red-400 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (     
            <div className="space-y-3">
                {users.map(user => (
                    <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                {roleBadge(user.role)}
                            </div>
                            <p className="text-xs text-gray-400">{user.departments?.name || 'No department assigned'}</p>
                        </div>
                        {user.role !== 'admin' && (
                            <button onClick={() => handleDeleteUser(user)} className="text-sm text-red-400 hover:text-red-600 transition-colors">
                                Delete
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* Courses tab */}
        {activeTab === 'courses' && (
          <div className="space-y-3">
            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">No courses yet.</p>
              </div>
            ) : (
              courses.map(course => (
                <div key={course.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{course.code}</span>
                      {course.departments?.name && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{course.departments.name}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">{course.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Taught by {course.profiles?.full_name || 'Unknown'}</p>
                  </div>
                  <Link href={`/courses/${course.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  )
}