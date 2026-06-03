'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function CoursePage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [profile, setProfile] = useState(null)
  const [course, setCourse] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [materials, setMaterials] = useState([])
  const [schedule, setSchedule] = useState([])
  const [assignments, setAssignments] = useState([])
  const [cats, setCats] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'announcements')
  const [loading, setLoading] = useState(true)

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [expandedAssignment, setExpandedAssignment] = useState(null)

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
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDescription, setAssignmentDescription] = useState('')
  const [assignmentDueDate, setAssignmentDueDate] = useState('')
  const [assignmentFile, setAssignmentFile] = useState(null)
  const [assignmentAttachmentType, setAssignmentAttachmentType] = useState('none')
  const [assignmentLinkUrl, setAssignmentLinkUrl] = useState('')
  const [catTitle, setCatTitle] = useState('')
  const [catDescription, setCatDescription] = useState('')
  const [catDueDate, setCatDueDate] = useState('')
  const [submissionFiles, setSubmissionFiles] = useState({})
  const [submitting, setSubmitting] = useState(null)
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
        { data: scheduleData },
        { data: assignmentsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('courses').select('*').eq('id', id).single(),
        supabase.from('announcements').select('*').eq('course_id', id).order('created_at', { ascending: false }),
        supabase.from('materials').select('*').eq('course_id', id).order('uploaded_at', { ascending: false }),
        supabase.from('schedule').select('*').eq('course_id', id),
        supabase.from('assignments').select('*').eq('course_id', id).order('due_date', { ascending: true })
      ])

      setProfile(profileData)
      setCourse(courseData)
      setAnnouncements(announcementsData || [])
      setMaterials(materialsData || [])
      setSchedule(scheduleData || [])
      setAssignments((assignmentsData || []).filter(a => a.type === 'assignment'))
      setCats((assignmentsData || []).filter(a => a.type === 'cat'))

      if (profileData.role === 'student') {
        const { data: submissionsData } = await supabase
          .from('submissions')
          .select('*')
          .eq('student_id', session.user.id)
        setSubmissions(submissionsData || [])
      }

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
      .select().single()
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
      const { error: uploadError } = await supabase.storage.from('materials').upload(fileName, materialFile)
      if (uploadError) { alert(uploadError.message); setSaving(false); return }
      const { data } = supabase.storage.from('materials').getPublicUrl(fileName)
      fileUrl = data.publicUrl
    } else {
      fileUrl = materialUrl
    }
    const { data: material, error } = await supabase
      .from('materials')
      .insert({ course_id: id, title: materialTitle, file_url: fileUrl })
      .select().single()
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
    if (path) await supabase.storage.from('materials').remove([decodeURIComponent(path)])
    await supabase.from('materials').delete().eq('id', material.id)
    setMaterials(materials.filter(m => m.id !== material.id))
  }

  const addSchedule = async (e) => {
    e.preventDefault()
    setSaving(true)
    setScheduleError('')

    const { data: deptCourses } = await supabase
      .from('courses').select('id').eq('department_id', course.department_id)
    const allCourseIds = deptCourses?.map(c => c.id) || []

    const { data: allEntries } = await supabase
      .from('schedule')
      .select('*, courses(title, code)')
      .in('course_id', allCourseIds)
      .eq('day', scheduleDay)

    const clash = allEntries?.find(s => scheduleStart < s.end_time && scheduleEnd > s.start_time)
    if (clash) {
      setScheduleError(`This clashes with ${clash.courses?.code} (${clash.start_time} – ${clash.end_time}) on ${scheduleDay}.`)
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('schedule')
      .insert({ course_id: id, day: scheduleDay, start_time: scheduleStart, end_time: scheduleEnd, location: scheduleLocation })
      .select().single()
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

  const addAssignment = async (e) => {
    e.preventDefault()
    setSaving(true)
    let fileUrl = ''

    if (assignmentAttachmentType === 'file' && assignmentFile) {
      const fileName = `assignments/${id}/${assignmentFile.name}`
      const { error: uploadError } = await supabase.storage.from('materials').upload(fileName, assignmentFile)
      if (uploadError) { alert(uploadError.message); setSaving(false); return }
      const { data } = supabase.storage.from('materials').getPublicUrl(fileName)
      fileUrl = data.publicUrl
    } else if (assignmentAttachmentType === 'link') {
      fileUrl = assignmentLinkUrl
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert({ course_id: id, title: assignmentTitle, description: assignmentDescription, type: 'assignment', due_date: assignmentDueDate, file_url: fileUrl || null })
      .select().single()

    if (!error) {
      setAssignments([...assignments, data].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)))
      setAssignmentTitle('')
      setAssignmentDescription('')
      setAssignmentDueDate('')
      setAssignmentFile(null)
      setAssignmentAttachmentType('none')
      setAssignmentLinkUrl('')
      setShowAssignmentForm(false)
    }
    setSaving(false)
  }

  const deleteAssignment = async (assignment) => {
    if (!confirm(`Delete "${assignment.title}"?`)) return
    if (assignment.file_url) {
      const path = assignment.file_url.split('/storage/v1/object/public/materials/')[1]
      if (path) await supabase.storage.from('materials').remove([decodeURIComponent(path)])
    }
    await supabase.from('submissions').delete().eq('assignment_id', assignment.id)
    await supabase.from('assignments').delete().eq('id', assignment.id)
    setAssignments(assignments.filter(a => a.id !== assignment.id))
  }

  const addCat = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('assignments')
      .insert({ course_id: id, title: catTitle, description: catDescription, type: 'cat', due_date: catDueDate })
      .select().single()
    if (!error) {
      setCats([...cats, data].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)))
      setCatTitle('')
      setCatDescription('')
      setCatDueDate('')
      setShowCatForm(false)
    }
    setSaving(false)
  }

  const deleteCat = async (cat) => {
    if (!confirm(`Delete "${cat.title}"?`)) return
    await supabase.from('assignments').delete().eq('id', cat.id)
    setCats(cats.filter(c => c.id !== cat.id))
  }

  const submitAssignment = async (assignment) => {
    const file = submissionFiles[assignment.id]
    if (!file) return
    setSubmitting(assignment.id)
    const { data: { session } } = await supabase.auth.getSession()
    const fileName = `${assignment.id}/${session.user.id}/${file.name}`
    const { error: uploadError } = await supabase.storage.from('submissions').upload(fileName, file, { upsert: true })
    if (uploadError) { alert(uploadError.message); setSubmitting(null); return }
    const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(fileName)
    const existing = submissions.find(s => s.assignment_id === assignment.id)
    if (existing) {
      await supabase.from('submissions').update({ file_url: urlData.publicUrl, submitted_at: new Date().toISOString() }).eq('id', existing.id)
      setSubmissions(submissions.map(s => s.id === existing.id ? { ...s, file_url: urlData.publicUrl, submitted_at: new Date().toISOString() } : s))
    } else {
      const { data: newSub } = await supabase
        .from('submissions')
        .insert({ assignment_id: assignment.id, student_id: session.user.id, file_url: urlData.publicUrl })
        .select().single()
      setSubmissions([...submissions, newSub])
    }
    setSubmissionFiles({ ...submissionFiles, [assignment.id]: null })
    setSubmitting(null)
  }

  const loadSubmissionsForAssignment = async (assignmentId) => {
    if (expandedAssignment === assignmentId) { setExpandedAssignment(null); return }
    const { data } = await supabase
      .from('submissions')
      .select('*, profiles(full_name)')
      .eq('assignment_id', assignmentId)
    setSubmissions(data || [])
    setExpandedAssignment(assignmentId)
  }

  const isLecturer = profile?.role === 'lecturer'

  const tabClass = (tab) =>
    `text-sm py-3 border-b-2 transition-colors cursor-pointer ${activeTab === tab
      ? 'border-blue-600 text-blue-600 font-medium'
      : 'border-transparent text-gray-500 hover:text-gray-900'
    }`

  const formatDueDate = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
    const formatted = d.toLocaleDateString('en-KE', { dateStyle: 'medium' })
    const time = d.toLocaleTimeString('en-KE', { timeStyle: 'short' })
    if (diffDays < 0) return { label: `${formatted} at ${time}`, urgent: false, overdue: true }
    if (diffDays === 0) return { label: `Today at ${time}`, urgent: true, overdue: false }
    if (diffDays === 1) return { label: `Tomorrow at ${time}`, urgent: true, overdue: false }
    if (diffDays <= 3) return { label: `${formatted} at ${time}`, urgent: true, overdue: false }
    return { label: `${formatted} at ${time}`, urgent: false, overdue: false }
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
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to dashboard</Link>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{course?.code}</span>
          <h2 className="text-2xl font-semibold text-gray-900 mt-3" style={{ fontFamily: 'var(--font-display)' }}>{course?.title}</h2>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          <button className={tabClass('announcements')} onClick={() => setActiveTab('announcements')}>Announcements</button>
          <button className={tabClass('materials')} onClick={() => setActiveTab('materials')}>Materials</button>
          <button className={tabClass('assignments')} onClick={() => setActiveTab('assignments')}>Assignments</button>
          <button className={tabClass('schedule')} onClick={() => setActiveTab('schedule')}>Schedule</button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Announcements</h3>
              {isLecturer && (
                <button onClick={() => setShowAnnouncementForm(!showAnnouncementForm)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
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
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">{saving ? 'Posting...' : 'Post'}</button>
                  <button type="button" onClick={() => setShowAnnouncementForm(false)} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">Cancel</button>
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

        {/* MATERIALS TAB */}
        {activeTab === 'materials' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Materials</h3>
              {isLecturer && (
                <button onClick={() => setShowMaterialForm(!showMaterialForm)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
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
                  <button type="button" onClick={() => setMaterialType('file')} className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${materialType === 'file' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>Upload file</button>
                  <button type="button" onClick={() => setMaterialType('link')} className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${materialType === 'link' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>Paste link</button>
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
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">{saving ? 'Saving...' : 'Save'}</button>
                  <button type="button" onClick={() => setShowMaterialForm(false)} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">Cancel</button>
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
                        <button onClick={() => deleteMaterial(m)} className="text-sm text-red-400 hover:text-red-600 transition-colors">Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {activeTab === 'assignments' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Assignments</h3>
              {isLecturer && (
                <button onClick={() => setShowAssignmentForm(!showAssignmentForm)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  + Add assignment
                </button>
              )}
            </div>

            {showAssignmentForm && (
              <form onSubmit={addAssignment} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} className={inputClass} placeholder="e.g. Assignment 1" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={assignmentDescription} onChange={(e) => setAssignmentDescription(e.target.value)} className={inputClass} rows={3} placeholder="Instructions..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due date & time</label>
                  <input type="datetime-local" value={assignmentDueDate} onChange={(e) => setAssignmentDueDate(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (optional)</label>
                  <div className="flex gap-3 mb-3">
                    <button type="button" onClick={() => setAssignmentAttachmentType('none')} className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${assignmentAttachmentType === 'none' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>None</button>
                    <button type="button" onClick={() => setAssignmentAttachmentType('file')} className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${assignmentAttachmentType === 'file' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>Upload file</button>
                    <button type="button" onClick={() => setAssignmentAttachmentType('link')} className={`text-sm px-4 py-2 rounded-lg border transition-colors font-medium ${assignmentAttachmentType === 'link' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>Paste link</button>
                  </div>
                  {assignmentAttachmentType === 'file' && (
                    <label className="flex items-center gap-3 w-full border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400 transition-colors">
                      <span className="text-sm text-white bg-gray-400 px-3 py-1 rounded-md whitespace-nowrap">Choose file</span>
                      <span className="text-sm text-gray-500 truncate">{assignmentFile ? assignmentFile.name : 'No file chosen'}</span>
                      <input type="file" onChange={(e) => setAssignmentFile(e.target.files[0])} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip" className="hidden" />
                    </label>
                  )}
                  {assignmentAttachmentType === 'link' && (
                    <input value={assignmentLinkUrl} onChange={(e) => setAssignmentLinkUrl(e.target.value)} className={inputClass} placeholder="https://drive.google.com/..." />
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">{saving ? 'Saving...' : 'Save'}</button>
                  <button type="button" onClick={() => setShowAssignmentForm(false)} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">Cancel</button>
                </div>
              </form>
            )}

            {assignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">No assignments yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map(a => {
                  const due = formatDueDate(a.due_date)
                  const studentSubmission = submissions.find(s => s.assignment_id === a.id)
                  const isExpanded = expandedAssignment === a.id
                  return (
                    <div key={a.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Assignment</span>
                              <span className={`text-xs font-medium ${due.overdue ? 'text-red-500' : due.urgent ? 'text-orange-500' : 'text-gray-400'}`}>
                                {due.overdue ? 'Overdue · ' : ''}{due.label}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-900">{a.title}</h4>
                            {a.description && <p className="text-sm text-gray-500 mt-1">{a.description}</p>}
                            {a.file_url && (
                              <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">📎 View attachment</a>
                            )}
                          </div>
                          <div className="flex items-center gap-3 sm:shrink-0 flex-wrap">
                            {isLecturer ? (
                              <>
                                <button onClick={() => loadSubmissionsForAssignment(a.id)} className="text-sm text-blue-600 hover:underline font-medium">
                                  {isExpanded ? 'Hide submissions' : 'View submissions'}
                                </button>
                                <button onClick={() => deleteAssignment(a)} className="text-sm text-red-400 hover:text-red-600 transition-colors">Delete</button>
                              </>
                            ) : studentSubmission ? (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">✓ Submitted</span>
                            ) : null}
                          </div>
                        </div>

                        {!isLecturer && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {studentSubmission && (
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-500">Submitted {new Date(studentSubmission.submitted_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</p>
                                <a href={studentSubmission.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View submission →</a>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-3 flex-1 border border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-blue-400 transition-colors">
                                <span className="text-xs text-white bg-gray-400 px-2 py-1 rounded-md whitespace-nowrap">Choose file</span>
                                <span className="text-xs text-gray-500 truncate">{submissionFiles[a.id] ? submissionFiles[a.id].name : studentSubmission ? 'Replace submission' : 'No file chosen'}</span>
                                <input type="file" onChange={(e) => setSubmissionFiles({ ...submissionFiles, [a.id]: e.target.files[0] })} className="hidden" />
                              </label>
                              <button
                                onClick={() => submitAssignment(a)}
                                disabled={!submissionFiles[a.id] || submitting === a.id}
                                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
                              >
                                {submitting === a.id ? 'Submitting...' : studentSubmission ? 'Resubmit' : 'Submit'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {isLecturer && isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50 p-5">
                          <p className="text-xs font-medium text-gray-500 mb-3">Submissions</p>
                          {submissions.length === 0 ? (
                            <p className="text-sm text-gray-400">No submissions yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {submissions.map(sub => (
                                <div key={sub.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{sub.profiles?.full_name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Submitted {new Date(sub.submitted_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}</p>
                                  </div>
                                  <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline font-medium">View →</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <div className="space-y-8">

            {/* Classes section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Classes</h3>
                {isLecturer && (
                  <button onClick={() => { setShowScheduleForm(!showScheduleForm); setScheduleError('') }} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    + Add class
                  </button>
                )}
              </div>

              {showScheduleForm && (
                <form onSubmit={addSchedule} className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                      <select value={scheduleDay} onChange={(e) => setScheduleDay(e.target.value)} className={inputClass}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => <option key={d}>{d}</option>)}
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
                    <button type="submit" disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">{saving ? 'Checking...' : 'Save'}</button>
                    <button type="button" onClick={() => { setShowScheduleForm(false); setScheduleError('') }} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">Cancel</button>
                  </div>
                </form>
              )}

              {schedule.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
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
                        {s.location && <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{s.location}</span>}
                        {isLecturer && (
                          <button onClick={() => deleteSchedule(s)} className="text-sm text-red-400 hover:text-red-600 transition-colors">Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CAT dates section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">CAT Dates</h3>
                  <p className="text-xs text-gray-400 mt-0.5">In-person assessments — informational only</p>
                </div>
                {isLecturer && (
                  <button onClick={() => setShowCatForm(!showCatForm)} className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                    + Schedule CAT
                  </button>
                )}
              </div>

              {showCatForm && (
                <form onSubmit={addCat} className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input value={catTitle} onChange={(e) => setCatTitle(e.target.value)} className={inputClass} placeholder="e.g. CAT 1" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={catDescription} onChange={(e) => setCatDescription(e.target.value)} className={inputClass} rows={2} placeholder="Topics covered, venue, duration..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & time</label>
                    <input type="datetime-local" value={catDueDate} onChange={(e) => setCatDueDate(e.target.value)} className={inputClass} required />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving} className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors font-medium">{saving ? 'Saving...' : 'Save'}</button>
                    <button type="button" onClick={() => setShowCatForm(false)} className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2">Cancel</button>
                  </div>
                </form>
              )}

              {cats.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                  <p className="text-gray-500 text-sm">No CATs scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cats.map(c => {
                    const due = formatDueDate(c.due_date)
                    return (
                      <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">CAT</span>
                            <span className={`text-xs ${due.overdue ? 'text-red-500' : due.urgent ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                              {due.overdue ? 'Past · ' : ''}{due.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{c.title}</p>
                          {c.description && <p className="text-xs text-gray-500 mt-1">{c.description}</p>}
                        </div>
                        {isLecturer && (
                          <button onClick={() => deleteCat(c)} className="text-sm text-red-400 hover:text-red-600 transition-colors shrink-0 ml-4">Delete</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  )
}