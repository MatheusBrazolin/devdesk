import { NOTE_LIMITS, type Note, type NoteLink } from '@devdesk/shared'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowLeft,
  Check,
  CircleDot,
  CloudAlert,
  GitPullRequest,
  Loader2,
  Pin,
  PinOff,
  Trash2,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/time'
import { Markdown } from './markdown'
import { useDeleteNote } from './queries'
import { TagInput } from './tag-input'
import { type SaveState, useAutosave } from './use-autosave'

type Mode = 'escrever' | 'visualizar'

interface NoteEditorProps {
  note: Note
  /** Volta para a lista no celular. */
  onBack: () => void
  onDeleted: () => void
}

/** Editor de uma nota. Montado com `key={note.id}`: cada nota tem o seu estado. */
export function NoteEditor({ note, onBack, onDeleted }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [tags, setTags] = useState(note.tags)
  const [links, setLinks] = useState(note.links)
  const [pinned, setPinned] = useState(note.pinned)
  const [mode, setMode] = useState<Mode>(note.body ? 'visualizar' : 'escrever')
  const { schedule, flush, state, error } = useAutosave(note.id)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  /** Vai para o corpo, no fim do texto; troca para "escrever" se precisar. */
  const focusBody = () => {
    setMode('escrever')
    requestAnimationFrame(() => {
      const field = bodyRef.current
      field?.focus()
      field?.setSelectionRange(field.value.length, field.value.length)
    })
  }

  return (
    <article className="flex h-full min-h-0 flex-col">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Voltar para a lista"
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <ModeSwitch mode={mode} onChange={setMode} />
        <SaveIndicator state={state} error={error} onRetry={flush} updatedAt={note.updatedAt} />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-pressed={pinned}
            aria-label={pinned ? 'Desafixar' : 'Fixar no painel Hoje'}
            title={pinned ? 'Desafixar' : 'Fixar no painel Hoje'}
            onClick={() => {
              setPinned(!pinned)
              schedule({ pinned: !pinned })
              flush()
            }}
            className={cn(pinned && 'text-accent hover:text-accent')}
          >
            {pinned ? <PinOff /> : <Pin />}
          </Button>
          <DeleteButton noteId={note.id} title={title || note.displayTitle} onDeleted={onDeleted} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-6">
          <textarea
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              schedule({ title: event.target.value })
            }}
            placeholder={note.displayTitle === 'Sem título' ? 'Sem título' : note.displayTitle}
            aria-label="Título"
            maxLength={200}
            rows={1}
            onKeyDown={(event) => {
              // Enter no título vai para o corpo, em vez de quebrar a linha.
              if (event.key === 'Enter') {
                event.preventDefault()
                focusBody()
              }
            }}
            className="w-full resize-none bg-transparent text-xl leading-snug font-semibold [field-sizing:content] placeholder:text-fg-subtle focus:outline-none"
          />

          <TagInput
            value={tags}
            onChange={(next) => {
              setTags(next)
              schedule({ tags: next })
            }}
          />

          {links.length > 0 && (
            <LinkList
              links={links}
              onRemove={(url) => {
                const next = links.filter((link) => link.url !== url)
                setLinks(next)
                schedule({ links: next })
              }}
            />
          )}

          {mode === 'escrever' ? (
            <textarea
              ref={bodyRef}
              maxLength={NOTE_LIMITS.body}
              value={body}
              onChange={(event) => {
                setBody(event.target.value)
                schedule({ body: event.target.value })
              }}
              onBlur={flush}
              autoFocus={!note.body}
              placeholder={'Escreva em markdown: # títulos, - listas, [ ] tarefas, `código`…'}
              aria-label="Conteúdo da nota"
              className="min-h-[50vh] w-full resize-none bg-transparent font-mono text-[13px] leading-relaxed [field-sizing:content] placeholder:text-fg-subtle focus:outline-none"
            />
          ) : body.trim() ? (
            // Não é um <button>: links e caixas de tarefa dentro de um botão são HTML inválido.
            <div className="group relative">
              <Button
                variant="outline"
                size="sm"
                onClick={focusBody}
                className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              >
                Editar
              </Button>
              <div
                onDoubleClick={focusBody}
                title="Clique duas vezes para editar"
                className="cursor-text"
              >
                <Markdown>{body}</Markdown>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-fg-subtle">
              Nota vazia.{' '}
              <button type="button" className="underline" onClick={focusBody}>
                Começar a escrever
              </button>
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div role="tablist" aria-label="Modo" className="flex rounded-md border border-border p-0.5">
      {(['escrever', 'visualizar'] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          onClick={() => onChange(value)}
          className={cn(
            'h-6 rounded px-2 text-[12px] capitalize transition-colors',
            mode === value ? 'bg-elevated font-medium text-fg' : 'text-fg-muted hover:text-fg',
          )}
        >
          {value}
        </button>
      ))}
    </div>
  )
}

function SaveIndicator({
  state,
  error,
  onRetry,
  updatedAt,
}: {
  state: SaveState
  error: string | null
  onRetry: () => void
  updatedAt: string
}) {
  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1 text-[12px] text-danger"
      >
        <CloudAlert className="size-3.5 shrink-0" />
        <span className="truncate">{error ?? 'Não salvou. Tentar de novo'}</span>
      </button>
    )
  }
  return (
    <span
      aria-live="polite"
      className="flex min-w-0 items-center gap-1 text-[12px] whitespace-nowrap text-fg-subtle"
    >
      {state === 'saved' ? (
        <>
          <Check className="size-3.5 shrink-0" />
          <span className="hidden truncate sm:inline">
            Salvo {formatRelative(new Date(updatedAt))}
          </span>
          <span className="sr-only sm:hidden">Salvo</span>
        </>
      ) : (
        <>
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          <span className="hidden sm:inline">Salvando…</span>
          <span className="sr-only sm:hidden">Salvando</span>
        </>
      )}
    </span>
  )
}

function LinkList({ links, onRemove }: { links: NoteLink[]; onRemove: (url: string) => void }) {
  return (
    <ul className="space-y-1.5">
      {links.map((link) => {
        const Icon = link.kind === 'pull_request' ? GitPullRequest : CircleDot
        return (
          <li
            key={link.url}
            className="group flex items-center gap-2 rounded-md border border-border bg-elevated/40 px-2.5 py-1.5"
          >
            <Icon className="size-3.5 shrink-0 text-success" strokeWidth={1.75} />
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 truncate text-[12px] hover:underline"
            >
              <span className="font-mono text-fg-subtle">
                {link.repository}#{link.number}
              </span>{' '}
              {link.title}
            </a>
            <button
              type="button"
              aria-label={`Desvincular ${link.repository}#${link.number}`}
              onClick={() => onRemove(link.url)}
              className="grid size-5 place-items-center rounded text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function DeleteButton({
  noteId,
  title,
  onDeleted,
}: {
  noteId: string
  title: string
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const remove = useDeleteNote()

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Apagar nota" title="Apagar nota">
          <Trash2 />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed top-1/3 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-border bg-surface p-5 shadow-pop animate-pop-in">
          <Dialog.Title className="text-sm font-semibold">Apagar “{title}”?</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-[13px] text-fg-muted">
            A nota some de vez. Os PRs e issues vinculados não são afetados.
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline">Cancelar</Button>
            </Dialog.Close>
            <Button
              className="bg-danger text-white hover:bg-danger/90"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(noteId, {
                  onSuccess: () => {
                    setOpen(false)
                    onDeleted()
                  },
                })
              }
            >
              {remove.isPending && <Loader2 className="animate-spin" />}
              Apagar
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
