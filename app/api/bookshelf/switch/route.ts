import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { book_id } = await request.json()
  if (!book_id) return Response.json({ error: 'book_id required' }, { status: 400 })

  const [bookRes, settingsRes] = await Promise.all([
    supabase.from('books').select('*').eq('id', book_id).single(),
    supabase.from('user_settings').select('profile, active_book_id').eq('user_id', user.id).single(),
  ])

  if (!bookRes.data) return Response.json({ error: 'Book not found' }, { status: 404 })
  if (settingsRes.data?.active_book_id === book_id) {
    return Response.json({ error: 'Already your active book' }, { status: 400 })
  }

  const book = bookRes.data
  const profile = settingsRes.data?.profile ?? {}

  // Generate new checklist via Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: `You are a financial literacy coach for first-generation wealth builders.
Generate a personalized action checklist based on the user's financial profile and the book's principles.
Return ONLY a valid JSON array — no markdown, no code fences, no explanation.
The array must contain exactly 7 objects, each with:
- "title": string (clear action item, max 60 characters)
- "instructions": string (markdown with 3-5 numbered steps; include specific apps/websites where helpful; explain WHY each step matters in simple language)`,
    messages: [{
      role: 'user',
      content: `Book: ${book.title} by ${book.author}

BOOK PRINCIPLES:
${book.principles}

USER PROFILE:
- Name: ${profile.name || 'Not provided'}
- Monthly income: ${profile.income || 'Not provided'}
- Debt: ${profile.debt || 'None'}
- Financial goal: ${profile.goals || 'Not provided'}
- First-generation wealth builder: ${profile.first_gen_context === 'yes' ? 'Yes' : 'No'}

Generate 7 actionable checklist items tailored to this person and this book's framework.
Write instructions in simple, clear language. Return ONLY the JSON array.`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  let items: { title: string; instructions: string }[] = []
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array found')
    items = JSON.parse(match[0])
  } catch {
    return Response.json({ error: 'Failed to generate checklist' }, { status: 500 })
  }

  // Swap everything in parallel
  await Promise.all([
    // Delete old checklist
    supabase.from('checklist_items').delete().eq('user_id', user.id),
    // Update active book
    supabase.from('user_settings')
      .update({ active_book_id: book_id })
      .eq('user_id', user.id),
    // Update active_book memory
    supabase.from('user_memories')
      .upsert({ user_id: user.id, key: 'active_book', value: book.title }, { onConflict: 'user_id,key' }),
  ])

  // Insert new checklist
  await supabase.from('checklist_items').insert(
    items.map((item, i) => ({
      user_id: user.id,
      book_id,
      title: item.title,
      instructions: item.instructions,
      sort_order: i,
    }))
  )

  return Response.json({ success: true })
}
