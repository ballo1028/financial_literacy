'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import type { ChecklistItem } from '@/lib/types'

export default function ChecklistSection({ initialItems }: { initialItems: ChecklistItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function markComplete(id: string) {
    setLoadingId(id)
    const res = await fetch(`/api/checklist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'complete' }),
    })
    if (res.ok) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'complete' } : item))
    }
    setLoadingId(null)
  }

  const pending = items.filter(i => i.status !== 'complete')
  const completed = items.filter(i => i.status === 'complete')

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Wealth Plan</h2>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <Accordion>
          {pending.map(item => (
            <AccordionItem key={item.id} value={item.id}>
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center gap-3 text-left">
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
                  <span className="text-sm font-medium text-gray-900">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="prose-sm ml-8">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-sm font-semibold text-gray-900 mt-3 mb-1">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-1">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-gray-600 mb-2 leading-relaxed">{children}</p>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-4 space-y-1.5 mb-3">{children}</ol>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-outside ml-4 space-y-1.5 mb-3">{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-gray-600 leading-relaxed">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-800">{children}</strong>
                      ),
                    }}
                  >
                    {item.instructions || ''}
                  </ReactMarkdown>
                </div>
                <div className="ml-8 mt-4">
                  <button
                    onClick={() => markComplete(item.id)}
                    disabled={loadingId === item.id}
                    className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingId === item.id ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Mark as Complete ✓'
                    )}
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {pending.length === 0 && (
          <div className="px-5 py-8 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm font-medium text-gray-900">All tasks complete!</p>
            <p className="text-xs text-gray-500 mt-1">You're building real wealth.</p>
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Completed ({completed.length})
          </h3>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {completed.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-5 py-3.5 not-last:border-b border-gray-50"
              >
                <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-sm text-gray-400 line-through">{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
