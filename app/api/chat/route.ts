import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

function buildSystemPrompt(
  bookTitle: string,
  bookAuthor: string,
  principles: string,
  memories: { key: string; value: string }[]
): string {
  const memoryLines = memories.length > 0
    ? memories.map(m => `- ${m.key.replace(/_/g, ' ')}: ${m.value}`).join('\n')
    : '- No information collected yet'

  return `You are WealthPath, a personal financial literacy coach for first-generation wealth builders.

YOUR STYLE:
- Use simple, clear language. No financial jargon — explain any terms you use.
- Be warm, encouraging, and practical. Give specific next steps.
- Keep responses focused — 2-4 short paragraphs max unless the user asks for more detail.
- Connect advice back to the user's specific situation and goals whenever possible.

ACTIVE FRAMEWORK: ${bookTitle} by ${bookAuthor}
${principles}

WHAT YOU KNOW ABOUT THIS USER:
${memoryLines}

Ground all advice in the active framework's principles. If you learn new financial facts about the user during the conversation, use them. When you don't know something relevant, ask.`
}

async function extractAndSaveMemories(
  userMessage: string,
  assistantResponse: string,
  userId: string,
  existingMemories: { key: string; value: string }[],
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const existing = existingMemories.map(m => `${m.key}: ${m.value}`).join('\n')

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: `Extract new or updated financial facts about the user from a conversation exchange.
Return ONLY a valid JSON array of {"key": "...", "value": "..."} objects — no markdown, no explanation.
Use snake_case keys. Examples: monthly_income, debt, savings_amount, job, financial_goal, has_emergency_fund, investment_account, completed_actions.
If nothing new was revealed, return [].`,
      messages: [{
        role: 'user',
        content: `EXISTING FACTS:
${existing || 'none'}

USER SAID: ${userMessage}

ASSISTANT SAID: ${assistantResponse}

Extract any new or updated facts about the user's financial situation. Return [] if nothing new.`,
      }],
    })

    const raw = result.content[0].type === 'text' ? result.content[0].text : ''
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return

    const facts: { key: string; value: string }[] = JSON.parse(match[0])
    if (!facts.length) return

    const rows = facts.map(f => ({ user_id: userId, key: f.key, value: f.value }))
    await supabase.from('user_memories').upsert(rows, { onConflict: 'user_id,key' })
  } catch {
    // memory extraction is best-effort, never throw
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await request.json()
  if (!message?.trim()) return Response.json({ error: 'Empty message' }, { status: 400 })

  const [settingsRes, memoriesRes, historyRes] = await Promise.all([
    supabase.from('user_settings').select('*, active_book:books(*)').eq('user_id', user.id).single(),
    supabase.from('user_memories').select('key, value').eq('user_id', user.id),
    supabase.from('chat_messages').select('role, content').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(20),
  ])

  const book = settingsRes.data?.active_book as { title: string; author: string; principles: string } | null
  const memories = memoriesRes.data || []
  const history = historyRes.data || []

  const systemPrompt = buildSystemPrompt(
    book?.title ?? 'General Financial Literacy',
    book?.author ?? '',
    book?.principles ?? '',
    memories
  )

  const claudeMessages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  let fullResponse = ''
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const claudeStream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
      })

      for await (const event of claudeStream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          fullResponse += event.delta.text
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  after(async () => {
    const saveSupabase = await createClient()
    await saveSupabase.from('chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: fullResponse },
    ])
    await extractAndSaveMemories(message, fullResponse, user.id, memories, saveSupabase)
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
