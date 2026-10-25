export type NoteColor =
  | "violet"
  | "amber"
  | "blue"
  | "emerald"
  | "rose"
  | "slate"

export interface NoteRow {
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

export interface Database {
  public: {
    Tables: {
      notes: {
        Row: NoteRow
        Insert: {
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
        Update: {
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
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
