import type { CreateNoteInput, Note, NotesQuery, UpdateNoteInput } from '@devdesk/shared'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const json = { 'content-type': 'application/json' }

const toSearch = (filter: NotesQuery) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) if (value) params.set(key, value)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const notesQuery = (filter: NotesQuery = {}) =>
  queryOptions({
    queryKey: ['notes', 'list', filter],
    queryFn: () => api<{ notes: Note[] }>(`/notes${toSearch(filter)}`).then((r) => r.notes),
    staleTime: 30_000,
  })

export const noteQuery = (id: string) =>
  queryOptions({
    queryKey: ['notes', 'detail', id],
    queryFn: () => api<{ note: Note }>(`/notes/${id}`).then((r) => r.note),
  })

export const tagsQuery = queryOptions({
  queryKey: ['notes', 'tags'],
  queryFn: () => api<{ tags: { tag: string; count: number }[] }>('/notes/tags').then((r) => r.tags),
  staleTime: 30_000,
})

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNoteInput = {}) =>
      api<{ note: Note }>('/notes', {
        method: 'POST',
        headers: json,
        body: JSON.stringify(input),
      }).then((r) => r.note),
    onSuccess: (note) => {
      queryClient.setQueryData(noteQuery(note.id).queryKey, note)
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}

/**
 * Salva parte de uma nota. Atualiza na hora o detalhe e as listas em cache
 * (atualização otimista), para a lista lateral acompanhar o que se digita.
 */
export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateNoteInput }) =>
      api<{ note: Note }>(`/notes/${id}`, {
        method: 'PATCH',
        headers: json,
        body: JSON.stringify(changes),
      }).then((r) => r.note),
    onSuccess: (note) => {
      queryClient.setQueryData(noteQuery(note.id).queryKey, note)
      queryClient.setQueriesData<Note[]>({ queryKey: ['notes', 'list'] }, (list) =>
        list?.map((item) => (item.id === note.id ? note : item)),
      )
      if (note.tags.length > 0 || note.pinned) {
        void queryClient.invalidateQueries({ queryKey: ['notes', 'tags'] })
      }
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: noteQuery(id).queryKey })
      void queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })
}
