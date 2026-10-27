import type { Note } from '@devdesk/shared'
import { Link } from '@tanstack/react-router'
import { Link2, Pin } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/time'
import { t } from '@/lib/i18n'
import { excerpt } from './excerpt'

export function NoteListItem({ note, active }: { note: Note; active: boolean }) {
  // O título vem da primeira linha do corpo quando está vazio; não repete no trecho.
  const preview = excerpt(note.title ? note.body : note.body.split('\n').slice(1).join('\n'))

  return (
    <li>
      <Link
        to="/notas"
        search={(prev) => ({ ...prev, nota: note.id })}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'block border-l-2 px-3 py-2.5 transition-colors',
          active ? 'border-accent bg-elevated' : 'border-transparent hover:bg-elevated/50',
        )}
      >
        <span className="flex items-center gap-1.5">
          {note.pinned && <Pin aria-label={t('fixada')} className="size-3 shrink-0 text-accent" />}
          <span className="truncate text-[13px] font-medium">{note.displayTitle}</span>
        </span>
        {preview && (
          <span className="mt-0.5 line-clamp-2 text-[12px] text-fg-muted">{preview}</span>
        )}
        <span className="mt-1 flex items-center gap-2 text-[11px] text-fg-subtle">
          {formatRelative(new Date(note.updatedAt))}
          {note.links.length > 0 && (
            <span className="flex items-center gap-0.5" title={t('Vinculada a PR ou issue')}>
              <Link2 className="size-3" />
              {note.links.length}
            </span>
          )}
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="font-mono">
              #{tag}
            </span>
          ))}
        </span>
      </Link>
    </li>
  )
}
