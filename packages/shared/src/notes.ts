import { z } from 'zod'

export const NOTE_LIMITS = {
  title: 200,
  body: 100_000,
  tags: 10,
  tag: 30,
  links: 20,
} as const

/** Um PR ou issue do GitHub a que a nota se refere. Só o endereço, nada é escrito lá. */
export const noteLinkSchema = z.object({
  kind: z.enum(['pull_request', 'issue']),
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'repositório no formato dono/nome'),
  number: z.number().int().positive(),
  url: z.url().refine((url) => url.startsWith('https://github.com/'), 'link do GitHub'),
  /** Título no momento do vínculo, para mostrar sem consultar o GitHub. */
  title: z.string().max(NOTE_LIMITS.title),
})

export const noteSchema = z.object({
  id: z.uuid(),
  /** Como a pessoa digitou; pode ser vazio. */
  title: z.string(),
  /** O título para exibir: o digitado ou a primeira linha do corpo. */
  displayTitle: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  pinned: z.boolean(),
  links: z.array(noteLinkSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export const createNoteInputSchema = z.object({
  title: z.string().max(NOTE_LIMITS.title).default(''),
  body: z.string().max(NOTE_LIMITS.body).default(''),
  tags: z.array(z.string().max(NOTE_LIMITS.tag)).max(NOTE_LIMITS.tags).default([]),
  pinned: z.boolean().default(false),
  links: z.array(noteLinkSchema).max(NOTE_LIMITS.links).default([]),
})

/** Atualização parcial: só os campos enviados mudam. */
export const updateNoteInputSchema = z
  .object({
    title: z.string().max(NOTE_LIMITS.title),
    body: z.string().max(NOTE_LIMITS.body),
    tags: z.array(z.string().max(NOTE_LIMITS.tag)).max(NOTE_LIMITS.tags),
    pinned: z.boolean(),
    links: z.array(noteLinkSchema).max(NOTE_LIMITS.links),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'nada para atualizar')

export const notesQuerySchema = z.object({
  q: z.string().max(200).optional(),
  tag: z.string().max(NOTE_LIMITS.tag).optional(),
  /** URL de um PR ou issue: só as notas ligadas a ele. */
  link: z.url().optional(),
})

export const notesResponseSchema = z.object({ notes: z.array(noteSchema) })
export const noteResponseSchema = z.object({ note: noteSchema })
export const tagsResponseSchema = z.object({
  tags: z.array(z.object({ tag: z.string(), count: z.number().int() })),
})

export type NoteLink = z.infer<typeof noteLinkSchema>
export type Note = z.infer<typeof noteSchema>
export type CreateNoteInput = z.input<typeof createNoteInputSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>
export type NotesQuery = z.infer<typeof notesQuerySchema>
