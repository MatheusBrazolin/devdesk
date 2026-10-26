import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import type { CreateNoteInput } from '@devdesk/shared'
import { ChevronDown, Loader2, NotebookPen, Plus, Search, SearchX, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ListSkeleton } from '@/features/work/list-states'
import { cn } from '@/lib/cn'
import { NoteEditor } from './note-editor'
import { NoteListItem } from './note-list-item'
import { NOTE_TEMPLATES } from './note-templates'
import { noteQuery, notesQuery, tagsQuery, useCreateNote } from './queries'

const route = getRouteApi('/app/notas')

export function NotesPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const list = useQuery(notesQuery({ q: search.q, tag: search.tag }))
  const tags = useQuery(tagsQuery)
  const create = useCreateNote()

  const setSearch = (patch: Partial<typeof search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const newNote = (template: CreateNoteInput = {}) =>
    create.mutate(
      search.tag
        ? { ...template, tags: [...new Set([...(template.tags ?? []), search.tag])] }
        : template,
      { onSuccess: (note) => setSearch({ nota: note.id }) },
    )

  const filtered = Boolean(search.q || search.tag)

  return (
    <div className="-mx-4 -my-6 h-[calc(100dvh-3rem)] sm:-mx-6 lg:mx-0 lg:my-0 lg:h-[calc(100dvh-6rem)]">
      <div className="grid h-full grid-cols-1 overflow-hidden border-border bg-surface lg:grid-cols-[19rem_minmax(0,1fr)] lg:rounded-lg lg:border">
        <aside
          aria-label="Lista de notas"
          className={cn(
            'flex min-h-0 min-w-0 flex-col border-border lg:border-r',
            search.nota && 'hidden lg:flex',
          )}
        >
          <div className="space-y-3 border-b border-border p-3">
            <div className="flex items-center justify-between">
              <h1 className="flex items-center gap-2 text-sm font-semibold">
                <span className="grid size-6 place-items-center rounded-md bg-merged/12 text-merged">
                  <NotebookPen className="size-3.5" strokeWidth={2} />
                </span>
                Notas
                {list.data && (
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-fg-subtle">
                    {list.data.length}
                  </span>
                )}
              </h1>
              <div className="flex">
                <Button
                  size="sm"
                  onClick={() => newNote()}
                  disabled={create.isPending}
                  className="rounded-r-none"
                >
                  {create.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                  Nova
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Nova nota a partir de um modelo"
                    disabled={create.isPending}
                    className={buttonVariants({
                      size: 'sm',
                      className: 'rounded-l-none border-l border-primary-fg/20 px-1.5',
                    })}
                  >
                    <ChevronDown />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>Começar de um modelo</DropdownMenuLabel>
                    {NOTE_TEMPLATES.map((template) => (
                      <DropdownMenuItem key={template.id} onSelect={() => newNote(template.note)}>
                        <span className="flex flex-col">
                          <span>{template.label}</span>
                          <span className="text-[11px] text-fg-subtle">{template.description}</span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <label className="relative flex h-8 items-center">
              <Search className="pointer-events-none absolute left-2.5 size-3.5 text-fg-subtle" />
              <span className="sr-only">Buscar nas notas</span>
              <input
                type="search"
                value={search.q ?? ''}
                onChange={(event) => setSearch({ q: event.target.value || undefined })}
                placeholder="Buscar nas notas"
                className="h-full w-full rounded-md border border-border bg-bg pr-2 pl-8 text-[13px] placeholder:text-fg-subtle focus:border-border-strong focus:outline-none"
              />
            </label>

            {tags.data && tags.data.length > 0 && (
              <div role="group" aria-label="Filtrar por tag" className="flex flex-wrap gap-1">
                {tags.data.map(({ tag, count }) => {
                  const active = search.tag === tag
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSearch({ tag: active ? undefined : tag })}
                      className={cn(
                        'flex h-6 items-center gap-1 rounded border px-1.5 font-mono text-[11px] transition-colors',
                        active
                          ? 'border-accent/40 bg-accent-soft text-accent'
                          : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
                      )}
                    >
                      #{tag}
                      <span className="text-fg-subtle">{count}</span>
                      {active && <X className="size-3" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.isPending ? (
              <ListSkeleton rows={5} />
            ) : list.isError ? (
              <p role="alert" className="p-4 text-[13px] text-danger">
                {list.error.message}
              </p>
            ) : list.data.length === 0 ? (
              filtered ? (
                <EmptyState
                  icon={SearchX}
                  title="Nada encontrado"
                  description="Tente outra busca ou outra tag."
                />
              ) : (
                <EmptyState
                  icon={NotebookPen}
                  title="Nenhuma nota ainda"
                  description="Anote decisões, passos de deploy ou o que conversar na review. Também dá para abrir uma nota direto de um PR ou issue."
                />
              )
            ) : (
              <ul className="divide-y divide-border">
                {list.data.map((note) => (
                  <NoteListItem key={note.id} note={note} active={note.id === search.nota} />
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section
          aria-label="Nota aberta"
          className={cn('min-h-0 min-w-0', !search.nota && 'hidden lg:block')}
        >
          {search.nota ? (
            <SelectedNote
              id={search.nota}
              onBack={() => setSearch({ nota: undefined })}
              onDeleted={() => setSearch({ nota: undefined })}
            />
          ) : (
            <div className="grid h-full place-items-center">
              <EmptyState
                icon={NotebookPen}
                title="Escolha uma nota"
                description="Ou comece uma nova: ela salva sozinha enquanto você escreve."
              >
                <Button variant="outline" onClick={() => newNote()} disabled={create.isPending}>
                  <Plus /> Nova nota
                </Button>
              </EmptyState>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SelectedNote({
  id,
  onBack,
  onDeleted,
}: {
  id: string
  onBack: () => void
  onDeleted: () => void
}) {
  const note = useQuery(noteQuery(id))

  if (note.isPending) {
    // A forma do editor: título, linha de tags e parágrafos.
    return (
      <div aria-busy="true" aria-label="Carregando nota" className="space-y-4 p-6">
        <Skeleton className="h-6 w-2/5" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2.5 pt-2">
          {[92, 84, 88, 60].map((width) => (
            <Skeleton key={width} className="h-3" style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>
    )
  }
  if (note.isError) {
    return (
      <div className="grid h-full place-items-center">
        <EmptyState
          icon={SearchX}
          title="Nota não encontrada"
          description="Ela pode ter sido apagada."
        >
          <Button variant="outline" onClick={onBack}>
            Voltar para a lista
          </Button>
        </EmptyState>
      </div>
    )
  }
  return <NoteEditor key={note.data.id} note={note.data} onBack={onBack} onDeleted={onDeleted} />
}
