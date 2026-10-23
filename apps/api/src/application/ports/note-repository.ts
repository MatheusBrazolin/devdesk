import type { Note } from '../../domain/note.js'

export interface NoteFilter {
  /** Texto no título ou no corpo. */
  q?: string
  tag?: string
  /** URL de um PR ou issue vinculado. */
  linkUrl?: string
}

export type NoteChanges = Partial<Pick<Note, 'title' | 'body' | 'tags' | 'pinned' | 'links'>>

/** Toda operação recebe o dono: uma pessoa nunca alcança a nota de outra. */
export interface NoteRepository {
  /** Fixadas primeiro, depois as editadas mais recentemente. */
  list(userId: string, filter: NoteFilter): Promise<Note[]>
  findById(userId: string, id: string): Promise<Note | null>
  create(note: Omit<Note, 'id'>): Promise<Note>
  update(userId: string, id: string, changes: NoteChanges, updatedAt: Date): Promise<Note | null>
  delete(userId: string, id: string): Promise<boolean>
  tagCounts(userId: string): Promise<{ tag: string; count: number }[]>
}
