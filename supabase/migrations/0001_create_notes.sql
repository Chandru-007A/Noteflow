-- Migration: 0001_create_notes.sql
-- Description: Create public.notes table with owner-scoped RLS for anonymous/authenticated users

-- 1. Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
  color TEXT NOT NULL DEFAULT 'violet' CHECK (color IN ('violet', 'amber', 'blue', 'emerald', 'rose', 'slate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance indexes for owner-scoped queries, sorting, and tag searches
CREATE INDEX IF NOT EXISTS idx_notes_owner_lookup 
  ON public.notes (user_id, is_trashed, is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_owner_updated_at 
  ON public.notes (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_owner_tags 
  ON public.notes USING GIN (tags);

-- 3. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_note_updated ON public.notes;
CREATE TRIGGER on_note_updated
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 5. Revoke default public/anon access and grant strictly to authenticated role
REVOKE ALL ON TABLE public.notes FROM PUBLIC;
REVOKE ALL ON TABLE public.notes FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notes TO authenticated;

-- 6. Explicit owner-scoped RLS policies
-- SELECT: Authenticated users can only read their own notes
CREATE POLICY "Users can select their own notes"
  ON public.notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Authenticated users can only insert notes assigned to their own user_id
CREATE POLICY "Users can insert their own notes"
  ON public.notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Authenticated users can only update their own notes, and cannot reassign user_id
CREATE POLICY "Users can update their own notes"
  ON public.notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Authenticated users can only delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON public.notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
