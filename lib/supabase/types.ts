export type NoteColor =
  | "violet"
  | "amber"
  | "blue"
  | "emerald"
  | "rose"
  | "slate"

export type NoteRow = {
  id: string
  user_id: string
  title: string
  content: string
  tags: string[]
  is_pinned: boolean
  is_favorite: boolean
  is_trashed: boolean
  color: NoteColor
  created_at: string
  updated_at: string
}

export type NoteInsert = {
  id?: string
  user_id: string
  title: string
  content?: string
  tags?: string[]
  is_pinned?: boolean
  is_favorite?: boolean
  is_trashed?: boolean
  color?: NoteColor
  created_at?: string
  updated_at?: string
}

export type NoteUpdate = {
  id?: string
  user_id?: string
  title?: string
  content?: string
  tags?: string[]
  is_pinned?: boolean
  is_favorite?: boolean
  is_trashed?: boolean
  color?: NoteColor
  created_at?: string
  updated_at?: string
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      notes: {
        Row: NoteRow
        Insert: NoteInsert
        Update: NoteUpdate
        Relationships: {
          foreignKeyName: string
          columns: string[]
          isOneToOne?: boolean
          referencedRelation: string
          referencedColumns: string[]
        }[]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
