'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SettingsPage() {
  const [profile, setProfile] = useState(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('account')
  const router = useRouter()

  // Name change
  const [newName, setNewName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Delete account
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

      setProfile(profileData)
      setEmail(session.user.email)
      setNewName(profileData.full_name)
      setLoading(false)
    }
    init()
  }, [])

  const handleNameUpdate = async (e) => {
    e.preventDefault()
    setNameSaving(true)
    setNameSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: newName })
      .eq('id', profile.id)

    if (!error) setNameSuccess(true)
    setNameSaving(false)
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordSaving(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    })

    if (signInError) {
      setPasswordError('Current password is incorrect')
      setPasswordSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordSaving(false)
  }

  const handleDeleteAccount = async (e) => {
    e.preventDefault()
    setDeleteError('')

    if (deleteConfirmEmail !== email) {
      setDeleteError('Email does not match your account email')
      return
    }

    setDeleting(true)

    const { error } = await supabase.rpc('delete_user', { user_id: profile.id })

    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/')
  }

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
      <header className="bg-white border-b border-gray-200 border-t-2 border-t-amber-400 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">Course Hub</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">← Back to dashboard</Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your account preferences</p>
        </div>

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Account info</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Email</span>
              <span className="text-sm text-gray-900">{email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-xs text-gray-500">Role</span>
              <span className="text-sm text-gray-900 capitalize">{profile?.role}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500">Department</span>
              <span className="text-sm text-gray-900">{profile?.departments?.name || 'Not assigned'}</span>
            </div>
          </div>
        </div>

        {/* Change name */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Display name</h3>
          <form onSubmit={handleNameUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
              <input
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNameSuccess(false) }}
                className={inputClass}
                required
              />
            </div>
            {nameSuccess && <p className="text-green-600 text-sm">Name updated successfully.</p>}
            <button
              type="submit"
              disabled={nameSaving || newName === profile?.full_name}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {nameSaving ? 'Saving...' : 'Update name'}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Change password</h3>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false) }}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false) }}
                className={inputClass}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false) }}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </div>
            {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-600 text-sm">Password updated successfully.</p>}
            <button
              type="submit"
              disabled={passwordSaving}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {passwordSaving ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>

        {/* Delete Account */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <h3 className="text-sm font-semibold text-red-600 mb-1">Delete Account</h3>
          <p className="text-xs text-gray-500 mb-5">
            Permanently delete your account and all associated data. This cannot be undone.
            To confirm, enter your email address below.
          </p>
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type <span className="font-semibold text-gray-800">{email}</span> to confirm
              </label>
              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={(e) => { setDeleteConfirmEmail(e.target.value); setDeleteError('') }}
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder={email}
              />
            </div>
            {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}
            <button
              type="submit"
              disabled={deleting || deleteConfirmEmail !== email}
              className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
            >
              {deleting ? 'Deleting...' : 'Delete my account'}
            </button>
          </form>
        </div>

      </main>
    </div>
  )
}