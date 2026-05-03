'use client'

import { useState } from 'react'
import type { Flashcard } from '@/lib/types'

export default function FlashcardDeck({ initialCards }: { initialCards: Flashcard[] }) {
  const [deck, setDeck] = useState(initialCards)
  const [index, setIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [done, setDone] = useState(false)
  const [finalStreak, setFinalStreak] = useState<number | null>(null)

  const card = deck[index]
  const progress = index
  const total = deck.length

  async function markUnderstood() {
    setCompleting(true)
    const isLast = index === deck.length - 1

    await fetch('/api/learn/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flashcard_id: card.id, session_complete: isLast }),
    })

    if (isLast) {
      const res = await fetch('/api/learn/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_complete: true }),
      })
      const data = await res.json()
      setFinalStreak(data.streak ?? null)
      setDone(true)
    } else {
      setIsFlipped(false)
      setTimeout(() => setIndex(i => i + 1), 150)
    }
    setCompleting(false)
  }

  function reviewAgain() {
    const current = deck[index]
    const rest = deck.filter((_, i) => i !== index)
    setDeck([...rest, current])
    setIsFlipped(false)
    // index stays the same, pointing to next card
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session complete!</h2>
        {finalStreak !== null && finalStreak > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-6 py-3 mb-4">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-orange-700 text-lg">{finalStreak}-day streak!</span>
          </div>
        )}
        <p className="text-gray-500 text-sm mb-6">Come back tomorrow to keep your streak going.</p>
        <a
          href="/dashboard"
          className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
        >
          Back to Dashboard
        </a>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h2>
        <p className="text-gray-500 text-sm mb-6">
          You&apos;ve learned all the cards for this book. New content coming soon.
        </p>
        <a
          href="/dashboard"
          className="bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
        >
          Back to Dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      {/* Progress */}
      <div className="w-full mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{progress} of {total} cards</span>
          <span>{Math.round((progress / total) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full mb-6" style={{ perspective: '1200px' }}>
        <div
          className="relative w-full transition-transform duration-500 cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '280px',
          }}
          onClick={() => !isFlipped && setIsFlipped(true)}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-xs font-medium text-green-600 uppercase tracking-widest mb-6">
              Concept
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-snug mb-8">
              {card.front}
            </h2>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>Tap to reveal</span>
              <span>👇</span>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-green-600 rounded-3xl shadow-sm flex flex-col justify-center p-8"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-xs font-medium text-green-200 uppercase tracking-widest mb-4">
              Explanation
            </div>
            <p className="text-white text-lg font-medium leading-relaxed mb-6">
              {card.back}
            </p>
            {card.analogy && (
              <div className="bg-green-700 rounded-2xl p-4">
                <div className="text-xs font-medium text-green-300 mb-1">Think of it like...</div>
                <p className="text-green-100 text-sm leading-relaxed">{card.analogy}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hint when not flipped */}
      {!isFlipped && (
        <p className="text-gray-400 text-sm mb-6">Tap the card to see the answer</p>
      )}

      {/* Action buttons (only when flipped) */}
      {isFlipped && (
        <div className="flex gap-3 w-full">
          <button
            onClick={reviewAgain}
            disabled={completing}
            className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Review Again
          </button>
          <button
            onClick={markUnderstood}
            disabled={completing}
            className="flex-1 bg-green-600 text-white font-semibold py-3.5 rounded-xl text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {completing ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Got it ✓</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
