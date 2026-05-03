import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import FlashcardDeck from '@/components/FlashcardDeck'
import type { Flashcard, Book } from '@/lib/types'

const DAILY_CARD_LIMIT = 5

export default async function LearnPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*, active_book:books(*)')
    .eq('user_id', user.id)
    .single()

  if (!settings?.onboarded) redirect('/onboarding')

  const book = settings.active_book as Book

  // Get IDs of cards the user has already understood
  const { data: progress } = await supabase
    .from('user_progress')
    .select('flashcard_id')
    .eq('user_id', user.id)

  const understoodIds = (progress || []).map(p => p.flashcard_id)

  // Fetch unlearned cards for active book
  let query = supabase
    .from('flashcards')
    .select('*')
    .eq('book_id', settings.active_book_id)
    .limit(DAILY_CARD_LIMIT)

  if (understoodIds.length > 0) {
    query = query.not('id', 'in', `(${understoodIds.join(',')})`)
  }

  const { data: cards } = await query

  const { data: streak } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar bookTitle={book?.title} />

      <main className="max-w-lg mx-auto">
        {/* Header */}
        <div className="px-4 pt-8 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Daily Lessons</h1>
            <p className="text-sm text-gray-500 mt-0.5">{book?.title}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5">
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold text-orange-700">
              {streak?.current_streak ?? 0}
            </span>
          </div>
        </div>

        {/* No flashcards generated yet */}
        {(!cards || cards.length === 0) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
            <div className="text-5xl mb-4">📖</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {understoodIds.length > 0 ? "You're all caught up!" : "No cards yet"}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {understoodIds.length > 0
                ? "You've learned all available cards for this book. New content will be added soon."
                : "Flashcard content hasn't been generated yet. Ask your admin to run the content generation."}
            </p>
            <a
              href="/dashboard"
              className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
            >
              Back to Dashboard
            </a>
          </div>
        )}

        {cards && cards.length > 0 && (
          <FlashcardDeck initialCards={cards as Flashcard[]} />
        )}
      </main>
    </div>
  )
}
