import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import ChatInterface from '@/components/ChatInterface'
import type { Book } from '@/lib/types'

export default async function ChatPage() {
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
  const profile = settings.profile as { name?: string }

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(30)

  const initialMessages = (history || []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar bookTitle={book?.title} />
      <ChatInterface
        initialMessages={initialMessages}
        userName={profile?.name}
        bookTitle={book?.title}
      />
    </div>
  )
}
