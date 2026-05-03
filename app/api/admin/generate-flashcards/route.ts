import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const { secret } = await request.json()
  if (secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: books } = await supabase.from('books').select('*')
  if (!books?.length) return Response.json({ error: 'No books found' }, { status: 404 })

  const results: Record<string, number> = {}

  for (const book of books) {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: `You are a financial literacy teacher creating flashcard content.
Write at a 6th grade reading level. Use short sentences. Avoid jargon.
Return ONLY a valid JSON object — no markdown, no code fences, no explanation.`,
      messages: [{
        role: 'user',
        content: `Book: ${book.title} by ${book.author}

PRINCIPLES:
${book.principles}

Generate flashcard content based on this book's framework.
Return this exact JSON structure:
{
  "topics": [
    {
      "title": "Topic name (max 40 chars)",
      "flashcards": [
        {
          "front": "Short concept name or question (max 50 chars)",
          "back": "Plain explanation in 2-3 short sentences. Use simple words.",
          "analogy": "One sentence real-life analogy that anyone can relate to."
        }
      ]
    }
  ]
}

Generate exactly 6 topics with exactly 5 flashcards each (30 total).
Make the content specific to ${book.title}'s framework and principles.
Return ONLY the JSON object.`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: { topics: { title: string; flashcards: { front: string; back: string; analogy: string }[] }[] }
    try {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON found')
      parsed = JSON.parse(match[0])
    } catch {
      results[book.title] = -1
      continue
    }

    let cardCount = 0

    for (let i = 0; i < parsed.topics.length; i++) {
      const topic = parsed.topics[i]

      const { data: topicRow } = await supabase
        .from('topics')
        .insert({ book_id: book.id, title: topic.title, sort_order: i })
        .select('id')
        .single()

      if (!topicRow) continue

      const cards = topic.flashcards.map(card => ({
        topic_id: topicRow.id,
        book_id: book.id,
        front: card.front,
        back: card.back,
        analogy: card.analogy,
      }))

      await supabase.from('flashcards').insert(cards)
      cardCount += cards.length
    }

    results[book.title] = cardCount
  }

  return Response.json({ success: true, results })
}
