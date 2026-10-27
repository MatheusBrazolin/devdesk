import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Link2, NotebookPen, Pin } from 'lucide-react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSkeleton } from '@/features/work/list-states'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/time'
import { t } from '@/lib/i18n'
import { excerpt } from './excerpt'
import { notesQuery } from './queries'

const MAX = 5

/** As notas fixadas, à mão no painel Hoje. */
export function PinnedNotesCard({ className }: { className?: string }) {
  const notes = useQuery(notesQuery())
  const pinned = notes.data?.filter((note) => note.pinned) ?? []

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pin className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
          {t('Notas fixadas')}
        </CardTitle>
        <Link to="/notas" className="text-[12px] text-fg-muted hover:text-fg">
          {t('Ver todas')}
        </Link>
      </CardHeader>
      <CardBody>
        {notes.isPending ? (
          <ListSkeleton rows={2} />
        ) : pinned.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title={t('Nenhuma nota fixada')}
            description={t('Fixe uma nota (ícone de alfinete no editor) para ela aparecer aqui.')}
          />
        ) : (
          <ul className="divide-y divide-border">
            {pinned.slice(0, MAX).map((note) => {
              const preview = excerpt(
                note.title ? note.body : note.body.split('\n').slice(1).join('\n'),
                90,
              )
              return (
                <li key={note.id}>
                  <Link
                    to="/notas"
                    search={{ nota: note.id }}
                    className="block px-4 py-2.5 transition-colors hover:bg-elevated/50"
                  >
                    <span className="flex items-center gap-1.5">
                      <Pin className="size-3 shrink-0 text-accent" />
                      <span className="truncate text-[13px] font-medium">{note.displayTitle}</span>
                    </span>
                    {preview && (
                      <span className="mt-0.5 line-clamp-2 text-[12px] text-fg-muted">
                        {preview}
                      </span>
                    )}
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-fg-subtle">
                      {formatRelative(new Date(note.updatedAt))}
                      {note.links.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Link2 className="size-3" />
                          {note.links.length}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
