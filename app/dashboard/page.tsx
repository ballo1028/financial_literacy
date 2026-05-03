import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import ChecklistSection from '@/components/ChecklistSection'
import type { Book, ChecklistItem, UserStreak } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [settingsRes, itemsRes, streakRes] = await Promise.all([
    supabase
      .from('user_settings')
      .select('*, active_book:books(*)')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('checklist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order'),
    supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single(),
  ])

  if (!settingsRes.data?.onboarded) redirect('/onboarding')

  const settings = settingsRes.data
  const items = (itemsRes.data || []) as ChecklistItem[]
  const streak = streakRes.data as UserStreak | null
  const book = settings.active_book as Book
  const profile = settings.profile as { name?: string }

  const completedCount = items.filter(i => i.status === 'complete').length
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar bookTitle={book?.title} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.name ? `Hey ${profile.name}! 👋` : 'Welcome back! 👋'}
          </h1>
          {book && (
            <p className="text-gray-500 mt-1 text-sm">
              Following{' '}
              <span className="font-medium text-gray-700">{book.title}</span>
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Streak card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-2xl mb-1">
              {(streak?.current_streak ?? 0) > 0 ? '🔥' : '💤'}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {streak?.current_streak ?? 0}
              <span className="text-sm font-medium text-gray-500 ml-1">day streak</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Best: {streak?.longest_streak ?? 0} days
            </div>
            <a
              href="/learn"
              className="inline-block mt-3 text-xs font-medium text-green-600 hover:underline"
            >
              Today&apos;s lessons →
            </a>
          </div>

          {/* Progress card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-2xl font-bold text-gray-900">
              {completedCount}
              <span className="text-sm font-medium text-gray-500 ml-1">
                / {items.length} done
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-green-600 h-1.5 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1.5">{progressPct}% complete</div>
          </div>
        </div>

        {/* Checklist */}
        <ChecklistSection initialItems={items} />
      </main>
    </div>
  )
}
