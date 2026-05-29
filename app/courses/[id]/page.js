'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function CoursePage() {
  const { id } = useParams()
  const router = useRouter()

  const [profile, setProfile] = useState(null)
  const [course, setCourse] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [materials, setMaterials] = useState([])
  const [schedule, setSchedule] = useState([])
  const [activeTab, setActiveTab] = useState('announcements')
  const [loading, setLoading] = useState(true)

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)

  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementBody, setAnnouncementBody] = useState('')
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialType, setMaterialType] = useState('file')
  const [materialFile, setMaterialFile] = useState(null)
  const [materialUrl, setMaterialUrl] = useState('')
  const [scheduleDay, setScheduleDay] = useState('Monday')
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [scheduleLocation, setScheduleLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [scheduleError, setScheduleError] = useState('')

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [
        { data: profileData },
        { data: courseData },
        { data: announcementsData },
        { data: materialsData },
        { data: scheduleData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('courses').select('*').eq('id', id).single(),
        supabase.from('announcements').select('*').eq('course_id', id).order('created_at', { ascending: false }),
        supabase.from('materials').select('*').eq('course_id', id).order('uploaded_at', { ascending: false }),
        supabase.from('schedule').select('*').eq('course_id', id)
      ])

      setProfile(profileData)
      setCourse(courseData)
      setAnnouncements(announcementsData || [])
      setMaterials(materialsData || [])
      setSchedule(scheduleData || [])
      setLoading(false)
    }
    init()
  }, [id])

  const addAnnouncement = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('announcements')
      .insert({ course_id: id, title: announcementTitle, body: announcementBody })
      .select()
      .single()
    if (!error) {
      setAnnouncements([data, ...announcements])
      setAnnouncementTitle('')
      setAnnouncementBody('')
      setShowAnnouncementForm(false)
    }
    setSaving(false)
  }

  const addMaterial = async (e) => {
    e.preventDefault()
    setSaving(true)
    let fileUrl = ''

    if (materialType === 'file') {
      const fileName = `${id}/${materialFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(fileName, materialFile)
      if (uploadError) {
        alert(uploadError.message)
        setSaving(false)
        return
      }
      const { data } = supabase.storage.from('materials').getPublicUrl(fileName)
      fileUrl = data.publicUrl
    } else {
      fileUrl = materialUrl
    }

    const { data: material, error } = await supabase
      .from('materials')
      .insert({ course_id: id, title: materialTitle, file_url: fileUrl })
      .select()
      .single()

    if (!error) {
      setMaterials([material, ...materials])
      setMaterialTitle('')
      setMaterialFile(null)
      setMaterialUrl('')
      setShowMaterialForm(false)
    }
    setSaving(false)
  }

  const deleteMaterial = async (material) => {
    if (!confirm(`Delete "${material.title}"?`)) return
    const path = material.file_url.split('/storage/v1/object/public/materials/')[1]
    if (path) {
      await supabase.storage.from('materials').remove([decodeURIComponent(path)])
    }
    await supabase.from('materials').delete().eq('id', material.id)
    setMaterials(materials.filter(m => m.id !== material.id))
  }

  const addSchedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    setScheduleError('')

    // Fetch all schedule entries across all courses in this department
    const { data: deptCourses } = await supabase
      .from('courses')
      .select('id')
      .eq('department_id', course.department_id)

    const allCourseIds = deptCourses?.map(c => c.id) || []

    const { data: allEntries } = await supabase
      .from('schedule')
      .select('*, courses(title, code)')
      .in('course_id', allCourseIds)
      .eq('day', scheduleDay)

    // Check for time overlaps: clash if newStart < existingEnd AND newEnd > existingStart
    const clash = allEntries?.find(s => {
      return scheduleStart < s.end_time && scheduleEnd > s.start_time
    })

    if (clash) {
      setScheduleError(`This clashes with ${clash.courses?.code} (${clash.start_time} – ${clash.end_time}) on ${scheduleDay}.`)
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('schedule')
      .insert({ course_id: id, day: scheduleDay, start_time: scheduleStart, end_time: scheduleEnd, location: scheduleLocation })
      .select()
      .single()

    if (!error) {
      setSchedule([...schedule, data])
      setScheduleDay('Monday')
      setScheduleStart('')
      setScheduleEnd('')
      setScheduleLocation('')
      setShowScheduleForm(false)
    }
    setSaving(false)
  }

  const deleteSchedule = async (entry) => {
    if (!confirm(`Delete this class (${entry.day} ${entry.start_time} – ${entry.end_time})?`)) return
    await supabase.from('schedule').delete().eq('id', entry.id)
    setSchedule(schedule.filter(s => s.id !== entry.id))
  }

  const isLecturer = profile?.role === 'lecturer'

  const tabClass = (tab) =>
    `text-sm py-3 border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'border-blue-600 text-blue-600 font-medium'
        : 'border-transparent text-gray-500 hover:text-gray-900'
    }`

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

      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
            {course?.code}
          </span>
          <h2 className="text-2xl font-semibold text-gray-900 mt-3">{course?.title}</h2>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          <button className={tabClass('announcements')} onClick={() => setActiveTab('announcements')}>Announcements</button>
          <button className={tabClass('materials')} onClick={() => setActiveTab('materials')}>Materials</button>
          <button className={tabClass('schedule')} onClick={() => setActiveTab('schedule')}>Schedule</button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {activeTab === 'announcements' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Announcements</h3>
              {isLecturer && (
                <button
                  onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  + Add announcement
                </button>
              )}
            </div>

            {showAnnouncementForm && (
              <form onSubmit={addAnnouncement} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} className={inputClass} rows={3} required />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
                    {saving ? 'Posting...' : 'Post'}
                  </button>
                  <button type="button" onClick={() => setShowAnnouncementForm(false)} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {announcements.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">No announcements yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                    <h4 className="font-medium text-gray-900 mb-1">{a.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{a.body}</p>
                    <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'materials' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Materials</h3>
              {isLecturer && (
                <button
                  onClick={() => setShowMaterialForm(!showMaterialForm)}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  + Add material
                </button>
              )}
            </div>

            {showMaterialForm && (
              <form onSubmit={addMaterial} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input value={materialTitle} onChange={(e) => setMaterialTitle(e.target.value)} className={inputClass} placeholder="e.g. Week 3 Lecture Notes" required />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setMaterialType('file')}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${materialType === 'file' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    Upload file
                  </button>
                  <button type="button" onClick={() => setMaterialType('link')}
                    className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${materialType === 'link' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    Paste link
                  </button>
                </div>
                {materialType === 'file' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                    <label className="flex items-center gap-3 w-full border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400 transition-colors">
                      <span className="text-sm text-white bg-gray-400 px-3 py-1 rounded-md whitespace-nowrap">Choose file</span>
                      <span className="text-sm text-gray-500 truncate">{materialFile ? materialFile.name : 'No file chosen'}</span>
                      <input key={showMaterialForm} type="file" onChange={(e) => setMaterialFile(e.target.files[0])} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" className="hidden" required />
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                    <input value={materialUrl} onChange={(e) => setMaterialUrl(e.target.value)} className={inputClass} placeholder="https://drive.google.com/..." required />
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowMaterialForm(false)} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {materials.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">No materials uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map(m => (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(m.uploaded_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">Open →</a>
                      {isLecturer && (
                        <button onClick={() => deleteMaterial(m)} className="text-sm text-red-400 hover:text-red-600 transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Schedule</h3>
              {isLecturer && (
                <button
                  onClick={() => { setShowScheduleForm(!showScheduleForm); setScheduleError('') }}
                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  + Add class
                </button>
              )}
            </div>

            {showScheduleForm && (
              <form onSubmit={addSchedule} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                    <select value={scheduleDay} onChange={(e) => setScheduleDay(e.target.value)} className={inputClass}>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input value={scheduleLocation} onChange={(e) => setScheduleLocation(e.target.value)} className={inputClass} placeholder="e.g. Room 204" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                    <input type="time" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                    <input type="time" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} className={inputClass} required />
                  </div>
                </div>
                {scheduleError && <p className="text-red-500 text-sm">{scheduleError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
                    {saving ? 'Checking...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setShowScheduleForm(false); setScheduleError('') }} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {schedule.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">No classes scheduled yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedule.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.day}</p>
                      <p className="text-xs text-gray-500 mt-1">{s.start_time} – {s.end_time}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {s.location && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{s.location}</span>
                      )}
                      {isLecturer && (
                        <button onClick={() => deleteSchedule(s)} className="text-sm text-red-400 hover:text-red-600 transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}