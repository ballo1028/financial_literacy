'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function Navbar({ bookTitle }: { bookTitle?: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">💸</span>
          <span className="font-bold text-gray-900">WealthPath</span>
          {bookTitle && (
            <span className="hidden sm:inline text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
              {bookTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/learn"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Learn
          </Link>
          <Link
            href="/chat"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Chat
          </Link>
          <Link
            href="/bookshelf"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Books
          </Link>
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
