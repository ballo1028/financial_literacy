import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { flashcard_id, session_complete } = await request.json()

  // Record card progress
  if (flashcard_id) {
    await supabase
      .from('user_progress')
      .upsert(
        { user_id: user.id, flashcard_id, understood: true, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,flashcard_id' }
      )
  }

  // Update streak when session is fully complete
  if (session_complete) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const { data: streak } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (streak) {
      if (streak.last_active_date === today) {
        return Response.json({ streak: streak.current_streak })
      }

      const newStreak = streak.last_active_date === yesterday
        ? streak.current_streak + 1
        : 1

      const longest = Math.max(newStreak, streak.longest_streak)

      await supabase
        .from('user_streaks')
        .update({ current_streak: newStreak, longest_streak: longest, last_active_date: today })
        .eq('user_id', user.id)

      return Response.json({ streak: newStreak })
    }
  }

  return Response.json({ success: true })
}
