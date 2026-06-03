import Link from 'next/link'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-display'
})

export default function NotFound() {
  return (
    <div className={`${playfair.variable} min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center`}>
      <p className="text-8xl font-black text-gray-200 mb-6" style={{ fontFamily: 'var(--font-display)' }}>404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
        Page not found
      </h1>
      <p className="text-gray-500 text-sm max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="bg-blue-600 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Go to dashboard
        </Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Back to home
        </Link>
      </div>
    </div>
  )
}