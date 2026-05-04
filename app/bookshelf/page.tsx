import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import BookshelfClient from '@/components/BookshelfClient'
import type { Book } from '@/lib/types'

export default async function BookshelfPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [booksRes, settingsRes] = await Promise.all([
    supabase.from('books').select('*').order('title'),
    supabase.from('user_settings').select('active_book_id, active_book:books(title)').eq('user_id', user.id).single(),
  ])

  if (!settingsRes.data?.active_book_id) redirect('/onboarding')

  const books = (booksRes.data || []) as Book[]
  const activeBookId = settingsRes.data.active_book_id
  const activeBook = (Array.isArray(settingsRes.data.active_book)
    ? settingsRes.data.active_book[0]
    : settingsRes.data.active_book) as { title: string } | null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar bookTitle={activeBook?.title} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Book Shelf</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Switch your framework anytime — your plan rebuilds automatically.
          </p>
        </div>

        <BookshelfClient books={books} activeBookId={activeBookId} />
      </main>
    </div>
  )
}
