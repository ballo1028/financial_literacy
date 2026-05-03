import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { book_id, profile } = await request.json()

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', book_id)
    .single()

  if (!book) {
    return Response.json({ error: 'Book not found' }, { status: 404 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: `You are a financial literacy coach for first-generation wealth builders.
Generate a personalized action checklist based on the user's financial profile and the book's principles.
Return ONLY a valid JSON array — no markdown, no explanation, no code fences.
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

Generate 7 actionable checklist items tailored to this person's situation and the book's framework.
Write instructions in simple, clear language — avoid financial jargon.
Return ONLY the JSON array.`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''

  let items: { title: string; instructions: string }[] = []
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array found')
    items = JSON.parse(match[0])
  } catch {
    return Response.json({ error: 'Failed to parse checklist from Claude' }, { status: 500 })
  }

  const checklistRows = items.map((item, i) => ({
    user_id: user.id,
    book_id,
    title: item.title,
    instructions: item.instructions,
    sort_order: i,
  }))

  const memoryRows = [
    { user_id: user.id, key: 'name', value: profile.name },
    { user_id: user.id, key: 'monthly_income', value: profile.income },
    { user_id: user.id, key: 'debt', value: profile.debt || 'none' },
    { user_id: user.id, key: 'goal', value: profile.goals },
    { user_id: user.id, key: 'first_gen', value: profile.first_gen_context },
    { user_id: user.id, key: 'active_book', value: book.title },
  ].filter(m => m.value)

  await Promise.all([
    supabase.from('user_settings').upsert(
      { user_id: user.id, active_book_id: book_id, profile, onboarded: true },
      { onConflict: 'user_id' }
    ),
    supabase.from('checklist_items').insert(checklistRows),
    supabase.from('user_memories').upsert(memoryRows, { onConflict: 'user_id,key' }),
    supabase.from('user_streaks').upsert(
      { user_id: user.id, current_streak: 0, longest_streak: 0 },
      { onConflict: 'user_id' }
    ),
  ])

  return Response.json({ success: true })
}
