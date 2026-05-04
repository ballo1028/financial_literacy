# WealthPath

A financial literacy app for first-generation wealth builders. Users pick a book framework (Rich Dad Poor Dad, I Will Teach You To Be Rich, etc.), get a personalized action plan, learn through daily flashcards, and chat with an AI coach that remembers their financial situation over time.

## Features

- **Personalized checklist** — Claude generates a 7-item wealth-building action plan based on your financial profile and chosen book framework. Each item has step-by-step instructions in an accordion dropdown.
- **Daily flashcards** — 5 cards per day from your active book with a card-flip animation. "Got it / Review again" buttons. Snapchat-style streak that increments when you complete your daily set.
- **Memory-aware chat** — Ask any financial question. Claude is grounded in your active book's principles and remembers key facts about you (income, debt, goals) across sessions.
- **Book shelf** — Switch between 5 financial frameworks anytime. Switching regenerates your checklist for the new book while keeping your streak and flashcard progress.

## Book Frameworks

| Book | Author |
|------|--------|
| Rich Dad Poor Dad | Robert Kiyosaki |
| I Will Teach You To Be Rich | Ramit Sethi |
| The Total Money Makeover | Dave Ramsey |
| The Millionaire Next Door | Thomas Stanley & William Danko |
| Think and Grow Rich | Napoleon Hill |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database + Auth | Supabase |
| AI | Claude API (claude-sonnet-4-6) |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/ballo1028/financial_literacy.git
cd financial_literacy
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase publishable key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase secret key (server-only)
ANTHROPIC_API_KEY=              # Anthropic API key
ADMIN_SECRET=                   # Any secret string for the admin route
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `supabase/schema.sql`
3. Then run `supabase/seed.sql` to load the 5 books and their principles
4. In **Authentication → Providers → Email**, turn off **Confirm email** for local dev

### 4. Generate flashcard content

Start the dev server, then run this once to seed ~150 flashcards across all 5 books:

```bash
npm run dev

curl -X POST http://localhost:3000/api/admin/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"secret": "your_admin_secret"}'
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up, pick a book, and complete onboarding.

## Project Structure

```
app/
├── page.tsx                        # Auth (sign up / sign in)
├── onboarding/page.tsx             # Book picker + quiz → generates checklist
├── dashboard/page.tsx              # Checklist with accordion instructions
├── learn/page.tsx                  # Daily flashcards + streak
├── chat/page.tsx                   # Memory-aware AI chat
├── bookshelf/page.tsx              # Switch book framework
└── api/
    ├── onboarding/route.ts         # Claude: generate checklist + seed memories
    ├── checklist/[id]/route.ts     # Mark checklist items complete
    ├── learn/complete/route.ts     # Record flashcard progress + update streak
    ├── chat/route.ts               # Streaming chat + memory extraction
    ├── bookshelf/switch/route.ts   # Regenerate checklist for new book
    └── admin/generate-flashcards/  # Seed flashcard content via Claude

components/
├── Navbar.tsx
├── ChecklistSection.tsx            # Interactive accordion checklist
├── FlashcardDeck.tsx               # Card flip animation + progress
├── ChatInterface.tsx               # Streaming chat UI
└── BookshelfClient.tsx             # Book grid + switch modal

lib/
├── supabase/
│   ├── client.ts                   # Browser client
│   ├── server.ts                   # Server client (uses cookies)
│   └── admin.ts                    # Service role client (admin routes only)
└── types.ts                        # TypeScript types for all DB tables

supabase/
├── schema.sql                      # Full database schema + RLS policies
└── seed.sql                        # 5 books with curated principles docs
```

## How Claude Is Used

| Feature | Claude call |
|---------|-------------|
| Onboarding | Generates 7 personalized checklist items with markdown instructions |
| Book switch | Regenerates checklist for new book framework |
| Chat | Streams responses grounded in active book + user memory |
| Chat (background) | Extracts financial facts from each exchange → updates user memory |
| Flashcard generation | One-time: generates 30 cards per book at 6th-grade reading level |
