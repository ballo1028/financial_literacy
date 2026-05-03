export type Book = {
  id: string
  title: string
  author: string
  description: string | null
  cover_emoji: string | null
  principles: string
  created_at: string
}

export type UserSettings = {
  id: string
  user_id: string
  active_book_id: string | null
  profile: UserProfile
  onboarded: boolean
  created_at: string
  updated_at: string
}

export type UserProfile = {
  name?: string
  income?: string
  debt?: string
  goals?: string
  first_gen_context?: string
}

export type ChecklistItem = {
  id: string
  user_id: string
  book_id: string
  title: string
  instructions: string | null
  status: 'pending' | 'in_progress' | 'complete'
  sort_order: number
  created_at: string
  updated_at: string
}

export type UserMemory = {
  id: string
  user_id: string
  key: string
  value: string
  updated_at: string
}

export type Topic = {
  id: string
  book_id: string
  title: string
  sort_order: number
  created_at: string
}

export type Flashcard = {
  id: string
  topic_id: string
  book_id: string
  front: string
  back: string
  analogy: string | null
  created_at: string
}

export type UserProgress = {
  id: string
  user_id: string
  flashcard_id: string
  understood: boolean
  completed_at: string
}

export type UserStreak = {
  id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  created_at: string
}

export type ChatMessage = {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
