import {
  createNoteInputSchema,
  type Note as NoteDto,
  notesQuerySchema,
  updateNoteInputSchema,
} from '@devdesk/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AppError } from '../../domain/errors.js'
import type { AppDependencies } from '../dependencies.js'
import { presentNote } from '../presenters.js'
import { readSessionToken } from '../session-cookie.js'

const paramsSchema = z.object({ id: z.string() })
const uuid = z.uuid()

export async function notesRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, notes } = deps.useCases
  const currentUser = (request: FastifyRequest) => getCurrentUser.execute(readSessionToken(request))

  /** Um id que nem é UUID não existe: 404, não 400 nem erro do banco. */
  const noteId = (request: FastifyRequest) => {
    const { id } = paramsSchema.parse(request.params)
    if (!uuid.safeParse(id).success) throw new AppError('NOT_FOUND', 'Nota não encontrada.')
    return id
  }

  app.get('/notes', async (request): Promise<{ notes: NoteDto[] }> => {
    const user = await currentUser(request)
    const { q, tag, link } = notesQuerySchema.parse(request.query)
    const list = await notes.list(user.id, { q, tag, linkUrl: link })
    return { notes: list.map(presentNote) }
  })

  app.get('/notes/tags', async (request) => {
    const user = await currentUser(request)
    return { tags: await notes.tags(user.id) }
  })

  app.get('/notes/:id', async (request): Promise<{ note: NoteDto }> => {
    const user = await currentUser(request)
    return { note: presentNote(await notes.get(user.id, noteId(request))) }
  })

  app.post('/notes', async (request, reply) => {
    const user = await currentUser(request)
    const input = createNoteInputSchema.parse(request.body ?? {})
    const note = await notes.create(user.id, input)
    return reply.status(201).send({ note: presentNote(note) })
  })

  app.patch('/notes/:id', async (request): Promise<{ note: NoteDto }> => {
    const user = await currentUser(request)
    const id = noteId(request)
    const input = updateNoteInputSchema.parse(request.body)
    return { note: presentNote(await notes.update(user.id, id, input)) }
  })

  app.delete('/notes/:id', async (request, reply) => {
    const user = await currentUser(request)
    await notes.delete(user.id, noteId(request))
    return reply.status(204).send()
  })
}
