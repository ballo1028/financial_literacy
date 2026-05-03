'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Book } from '@/lib/types'

const LOADING_MESSAGES = [
  'Analyzing your profile...',
  'Reading book principles...',
  'Crafting your personalized plan...',
  'Building your checklist...',
  'Almost there...',
]

export default function OnboardingPage() {
  const [step, setStep] = useState<'books' | 'quiz' | 'generating'>('books')
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [error, setError] = useState('')

  const [profile, setProfile] = useState({
    name: '',
    income: '',
    debt: '',
    goals: '',
    first_gen_context: 'yes',
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
    })
    supabase.from('books').select('*').order('title').then(({ data }) => {
      if (data) setBooks(data)
    })
  }, [])

  useEffect(() => {
    if (step !== 'generating') return
    const interval = setInterval(() => {
      setLoadingMsg(i => (i + 1) % LOADING_MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [step])

  async function handleGenerate() {
    setStep('generating')
    setError('')

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: selectedBook!.id, profile }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Something went wrong')
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('quiz')
    }
  }

  if (step === 'generating') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {LOADING_MESSAGES[loadingMsg]}
          </h2>
          <p className="text-gray-500 text-sm">
            Claude is building your personalized wealth plan based on{' '}
            <span className="font-medium text-green-600">{selectedBook?.title}</span>
          </p>
        </div>
      </div>
    )
  }

  if (step === 'books') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="mb-2 text-sm font-medium text-gray-400">Step 1 of 2</div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
            <div className="bg-green-600 h-1.5 rounded-full w-1/2" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Pick your framework</h1>
          <p className="text-gray-500 mb-8">
            Choose the book that will guide your wealth-building journey. You can switch later.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  selectedBook?.id === book.id
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-3xl mb-2">{book.cover_emoji}</div>
                <div className="font-semibold text-gray-900 text-sm">{book.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 mb-2">{book.author}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{book.description}</div>
              </button>
            ))}
          </div>

          <button
            disabled={!selectedBook}
            onClick={() => setStep('quiz')}
            className="w-full bg-green-600 text-white font-semibold rounded-lg py-3 text-sm hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="mb-2 text-sm font-medium text-gray-400">Step 2 of 2</div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
          <div className="bg-green-600 h-1.5 rounded-full w-full" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tell us about yourself</h1>
        <p className="text-gray-500 mb-8">
          Your answers help Claude personalize your wealth-building plan.
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What's your first name?
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder="Alex"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What's your monthly take-home income (roughly)?
            </label>
            <input
              type="text"
              value={profile.income}
              onChange={e => setProfile(p => ({ ...p, income: e.target.value }))}
              placeholder="e.g. $2,500 or $3,000/month"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Do you have any debt?
            </label>
            <input
              type="text"
              value={profile.debt}
              onChange={e => setProfile(p => ({ ...p, debt: e.target.value }))}
              placeholder="e.g. student loans $18k, credit card $2k, or none"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What's your #1 financial goal right now?
            </label>
            <input
              type="text"
              value={profile.goals}
              onChange={e => setProfile(p => ({ ...p, goals: e.target.value }))}
              placeholder="e.g. stop living paycheck to paycheck"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Are you the first in your family to build wealth?
            </label>
            <div className="flex gap-3">
              {['yes', 'no'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setProfile(p => ({ ...p, first_gen_context: val }))}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                    profile.first_gen_context === val
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {val === 'yes' ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep('books')}
              className="flex-1 border border-gray-200 text-gray-600 font-medium rounded-lg py-3 text-sm hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              disabled={!profile.name || !profile.goals}
              onClick={handleGenerate}
              className="flex-1 bg-green-600 text-white font-semibold rounded-lg py-3 text-sm hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Build My Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
