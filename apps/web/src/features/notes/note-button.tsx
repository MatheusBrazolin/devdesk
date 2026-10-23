import type { NoteLink } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, NotebookPen } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { notesQuery, useCreateNote } from './queries'

/**
 * Botão de notas de um PR ou issue. Abre a nota mais recente ligada ao item
 * ou, se não houver, cria uma já vinculada. Nada é escrito no GitHub: a nota
 * fica no DevDesk e guarda só o endereço do item.
 */
export function NoteButton({ item }: { item: NoteLink }) {
  // Uma consulta só para a página inteira: o React Query compartilha o cache.
  const notes = useQuery(notesQuery())
  const create = useCreateNote()
  const navigate = useNavigate()
  const linked =
    notes.data?.filter((note) => note.links.some((link) => link.url === item.url)) ?? []
  const label =
    linked.length > 0
      ? `${linked.length} ${linked.length === 1 ? 'nota' : 'notas'} sobre ${item.repository}#${item.number}`
      : `Anotar sobre ${item.repository}#${item.number}`

  const open = () => {
    const [latest] = linked
    if (latest) return void navigate({ to: '/notas', search: { nota: latest.id } })
    create.mutate(
      { title: item.title.slice(0, 200), links: [item] },
      {
        onSuccess: (note) => void navigate({ to: '/notas', search: { nota: note.id } }),
        onError: (error) =>
          toast.error('Não foi possível criar a nota', { description: error.message }),
      },
    )
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={create.isPending}
      aria-label={label}
      title={label}
      className={cn(
        'relative z-10 flex h-6 items-center gap-1 rounded px-1.5 font-mono text-[11px] transition-colors hover:bg-elevated',
        linked.length > 0
          ? 'text-accent'
          : 'text-fg-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
      )}
    >
      {create.isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <NotebookPen className="size-3.5" />
      )}
      {linked.length > 0 && linked.length}
    </button>
  )
}
