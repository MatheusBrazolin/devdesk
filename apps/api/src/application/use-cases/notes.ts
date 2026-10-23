import type { CreateNoteInput, UpdateNoteInput } from '@devdesk/shared'
import { AppError } from '../../domain/errors.js'
import { dedupeLinks, normalizeTags, type Note } from '../../domain/note.js'
import type { NoteChanges, NoteFilter, NoteRepository } from '../ports/note-repository.js'
import type { Clock } from '../ports/security.js'

const notFound = () => new AppError('NOT_FOUND', 'Nota não encontrada.')

/** Casos de uso das notas. São pequenos o bastante para morar juntos. */
export class Notes {
  constructor(
    private readonly repository: NoteRepository,
    private readonly clock: Clock,
  ) {}

  list(userId: string, filter: NoteFilter = {}): Promise<Note[]> {
    const tag = filter.tag ? normalizeTags([filter.tag])[0] : undefined
    return this.repository.list(userId, { ...filter, tag, q: filter.q?.trim() || undefined })
  }

  async get(userId: string, id: string): Promise<Note> {
    const note = await this.repository.findById(userId, id)
    if (!note) throw notFound()
    return note
  }

  create(userId: string, input: Required<CreateNoteInput>): Promise<Note> {
    const now = this.clock.now()
    return this.repository.create({
      userId,
      title: input.title.trim(),
      body: input.body,
      tags: normalizeTags(input.tags),
      pinned: input.pinned,
      links: dedupeLinks(input.links),
      createdAt: now,
      updatedAt: now,
    })
  }

  async update(userId: string, id: string, input: UpdateNoteInput): Promise<Note> {
    const changes: NoteChanges = {
      ...input,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.tags && { tags: normalizeTags(input.tags) }),
      ...(input.links && { links: dedupeLinks(input.links) }),
    }
    const note = await this.repository.update(userId, id, changes, this.clock.now())
    if (!note) throw notFound()
    return note
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.repository.delete(userId, id))) throw notFound()
  }

  tags(userId: string) {
    return this.repository.tagCounts(userId)
  }
}
