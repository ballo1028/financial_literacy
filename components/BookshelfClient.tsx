'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Book } from '@/lib/types'

export default function BookshelfClient({
  books,
  activeBookId,
}: {
  books: Book[]
  activeBookId: string | null
}) {
  const [pending, setPending] = useState<Book | null>(null)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function confirmSwitch() {
    if (!pending) return
    setSwitching(true)
    setError('')

    const res = await fetch('/api/bookshelf/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: pending.id }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
      setSwitching(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {books.map(book => {
          const isActive = book.id === activeBookId
          return (
            <div
              key={book.id}
              className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                isActive ? 'border-green-600' : 'border-gray-100'
              }`}
            >
              <div className="text-3xl mb-2">{book.cover_emoji}</div>
              <div className="font-semibold text-gray-900 text-sm leading-snug">{book.title}</div>
              <div className="text-xs text-gray-500 mt-0.5 mb-3">{book.author}</div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">{book.description}</p>

              {isActive ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded-lg px-3 py-2 w-fit">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Active Framework
                </div>
              ) : (
                <button
                  onClick={() => { setPending(book); setError('') }}
                  className="text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  Switch to this book →
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirmation modal */}
      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="text-3xl mb-3">{pending.cover_emoji}</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Switch to &ldquo;{pending.title}&rdquo;?
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              by {pending.author}
            </p>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Your checklist will be regenerated using this book&apos;s framework.
              Your current checklist progress will be cleared.
              Your streak and learned flashcards are kept.
            </p>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
            )}

            {switching ? (
              <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Regenerating your plan...</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setPending(null); setError('') }}
                  className="flex-1 border border-gray-200 text-gray-600 font-medium rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSwitch}
                  className="flex-1 bg-green-600 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-green-700 transition-colors"
                >
                  Switch Framework
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
