import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'

const playfair = Playfair_Display({
    subsets: ['latin'],
    weight: ['400', '700', '900'],
    variable: '--font-display'
})

const dmSans = DM_Sans({
    subsets: ['latin'],
    variable: '--font-body'
})

const features = [
    {
        icon: '📚',
        color: '#dbeafe',
        title: 'Course Materials',
        description: 'Upload and access lecture notes, PDFs, and resources in one place. No more hunting through WhatsApp chats or email threads.'
    },
    {
        icon: '📣',
        color: '#fef9c3',
        title: 'Announcements',
        description: 'Lecturers post updates directly to enrolled students. Important notices never get buried in group chats again.'
    },
    {
        icon: '🗓️',
        color: '#dcfce7',
        title: 'Weekly Schedule',
        description: 'A live visual calendar showing all your classes across all courses. Department-wide clash detection keeps timetables conflict-free.'
    },
    {
        icon: '📝',
        color: '#ffe4e6',
        title: 'Assignments & CATs',
        description: 'Lecturers set deadlines, students submit work directly on the platform. Due dates appear on your calendar automatically.'
    }
]

const steps = [
    { number: '01', title: 'Create an account', description: 'Register with your university email, select your department and role.' },
    { number: '02', title: 'Join your courses', description: 'Browse and enroll in courses offered by your department.' },
    { number: '03', title: 'Stay on top of everything', description: 'Access materials, track deadlines, and check your schedule — all in one tab.' }
]

export default function HomePage() {
    return (
        <div className={`${playfair.variable} ${dmSans.variable}`} style={{ fontFamily: 'var(--font-body, sans-serif)' }}>

            {/* Hero */}
            <section style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)', position: 'relative', overflow: 'hidden' }} className="min-h-screen flex flex-col">

                {/* Subtle grid overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />

                {/* Nav */}
                <nav className="relative flex items-center justify-between px-6 md:px-12 py-6 max-w-6xl mx-auto w-full">
                    <span style={{ fontFamily: 'var(--font-display, serif)', color: 'white' }} className="text-xl font-bold tracking-tight">
                        Course Hub
                    </span>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors text-white/70 hover:text-white">
                            Sign in
                        </Link>
                        <Link href="/register" className="text-sm font-semibold px-5 py-2 rounded-lg transition-opacity hover:opacity-90" style={{ background: '#f59e0b', color: '#000' }}>
                            Get started
                        </Link>
                    </div>
                </nav>

                {/* Hero content */}
                <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                        <span className="text-sm" style={{ color: '#fcd34d' }}>Multimedia University of Kenya</span>
                    </div>

                    <h1 className="font-black max-w-4xl mb-6" style={{ fontFamily: 'var(--font-display, serif)', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', lineHeight: 1.05, color: 'white' }}>
                        Your campus,{' '}
                        <span style={{ color: '#f59e0b' }}>unified.</span>
                    </h1>

                    <p className="text-lg max-w-2xl mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        Course materials, announcements, schedules, and assignments — consolidated into one platform. No more switching between WhatsApp, Moodle, and Google Drive.
                    </p>

                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <Link href="/register" className="px-8 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity" style={{ background: '#f59e0b', color: '#000' }}>
                            Create free account
                        </Link>
                        <Link href="/login" className="px-8 py-3.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                            Sign in →
                        </Link>
                    </div>
                </div>

                {/* Bottom fade into next section */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to top, #f8fafc, transparent)', pointerEvents: 'none' }} />
            </section>

            {/* Features */}
            <section className="bg-gray-50 py-24 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display, serif)' }}>
                            Everything in one tab.
                        </h2>
                        <p className="text-gray-500 text-lg max-w-xl mx-auto">
                            Built for students and lecturers who are tired of fragmented academic tools.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-2xl" style={{ background: f.color }}>
                                    {f.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="bg-white py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-display, serif)' }}>
                            Up and running in minutes.
                        </h2>
                        <p className="text-gray-500 text-lg">No setup. No configuration. Just sign up and go.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {steps.map((s, i) => (
                            <div key={i} className="text-center">
                                <div className="text-5xl font-black mb-4" style={{ fontFamily: 'var(--font-display, serif)', color: '#e2e8f0' }}>
                                    {s.number}
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-2">{s.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roles */}
            <section className="bg-gray-50 py-24 px-6">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl p-10" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
                        <div className="text-3xl mb-4">🎓</div>
                        <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display, serif)' }}>For students</h3>
                        <ul className="space-y-2">
                            {['Enroll in your department courses', 'Access materials and announcements', 'Submit assignments before deadlines', 'Track your weekly schedule'].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    <span style={{ color: '#f59e0b' }}>✓</span> {item}
                                </li>
                            ))}
                        </ul>
                        <Link href="/register" className="inline-block mt-8 px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: '#f59e0b', color: '#000' }}>
                            Join as student
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-10">
                        <div className="text-3xl mb-4">👩‍🏫</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display, serif)' }}>For lecturers</h3>
                        <ul className="space-y-2">
                            {['Create and manage your courses', 'Upload materials and post announcements', 'Set assignments and CATs with deadlines', 'View student submissions'].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="text-blue-500">✓</span> {item}
                                </li>
                            ))}
                        </ul>
                        <Link href="/register" className="inline-block mt-8 px-6 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 transition-colors" style={{ background: '#2563eb' }}>
                            Join as lecturer
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 text-center" style={{ background: 'linear-gradient(160deg, #0f172a, #1e3a5f)' }}>
                <h2 className="text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-display, serif)', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                    Ready to get organised?
                </h2>
                <p className="mb-10 text-lg" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    Join your department on Course Hub today.
                </p>
                <Link href="/register" className="inline-block px-10 py-4 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity" style={{ background: '#f59e0b', color: '#000' }}>
                    Create your free account
                </Link>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 px-6 py-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
                    <span className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-display, serif)' }}>Course Hub</span>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Multimedia University of Kenya · Built by Laban Oluoch Ndegwa
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-xs hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>Sign in</Link>
                        <Link href="/register" className="text-xs hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>Register</Link>
                    </div>
                </div>
            </footer>

        </div>
    )
}