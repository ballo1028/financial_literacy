-- ============================================================
-- FINANCIAL LITERACY APP — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- BOOKS
-- ============================================================
create table books (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  author      text not null,
  description text,
  cover_emoji text,                 -- fallback if no image
  principles  text not null,        -- the curated principles doc fed into Claude
  created_at  timestamptz default now()
);

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table user_settings (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references auth.users(id) on delete cascade unique not null,
  active_book_id uuid references books(id),
  profile        jsonb default '{}'::jsonb,
  -- profile shape: { income, debt, goals, first_gen_context, name }
  onboarded      boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ============================================================
-- CHECKLIST
-- ============================================================
create table checklist_items (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  book_id      uuid references books(id) not null,
  title        text not null,
  instructions text,               -- markdown step-by-step, shown in accordion
  status       text default 'pending' check (status in ('pending', 'in_progress', 'complete')),
  sort_order   int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- USER MEMORY (persistent facts extracted from chat)
-- ============================================================
create table user_memories (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  key        text not null,
  value      text not null,
  updated_at timestamptz default now(),
  unique(user_id, key)
);

-- ============================================================
-- TOPICS (per book)
-- ============================================================
create table topics (
  id         uuid primary key default uuid_generate_v4(),
  book_id    uuid references books(id) on delete cascade not null,
  title      text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- FLASHCARDS (per topic)
-- ============================================================
create table flashcards (
  id         uuid primary key default uuid_generate_v4(),
  topic_id   uuid references topics(id) on delete cascade not null,
  book_id    uuid references books(id) on delete cascade not null,
  front      text not null,        -- concept name
  back       text not null,        -- plain language explanation
  analogy    text,                 -- real-life analogy
  created_at timestamptz default now()
);

-- ============================================================
-- USER FLASHCARD PROGRESS
-- ============================================================
create table user_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  flashcard_id uuid references flashcards(id) on delete cascade not null,
  understood   boolean default true,
  completed_at timestamptz default now(),
  unique(user_id, flashcard_id)
);

-- ============================================================
-- STREAKS
-- ============================================================
create table user_streaks (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade unique not null,
  current_streak   int default 0,
  longest_streak   int default 0,
  last_active_date date,
  created_at       timestamptz default now()
);

-- ============================================================
-- CHAT HISTORY (optional — for showing past messages in UI)
-- ============================================================
create table chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table user_settings    enable row level security;
alter table checklist_items  enable row level security;
alter table user_memories    enable row level security;
alter table user_progress    enable row level security;
alter table user_streaks     enable row level security;
alter table chat_messages    enable row level security;

-- Users can only read/write their own data
create policy "own data" on user_settings    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on checklist_items  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on user_memories    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on user_progress    using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on user_streaks     using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data" on chat_messages    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Books, topics, flashcards are public read
alter table books      enable row level security;
alter table topics     enable row level security;
alter table flashcards enable row level security;

create policy "public read" on books      for select using (true);
create policy "public read" on topics     for select using (true);
create policy "public read" on flashcards for select using (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index on checklist_items (user_id, book_id);
create index on user_memories   (user_id);
create index on user_progress   (user_id, flashcard_id);
create index on flashcards      (book_id, topic_id);
create index on chat_messages   (user_id, created_at);
