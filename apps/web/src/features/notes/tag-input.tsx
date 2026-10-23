import { NOTE_LIMITS } from '@devdesk/shared'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  max?: number
}

/** Tags como fichas. Enter, vírgula ou espaço confirmam; Backspace no vazio apaga a última. */
export function TagInput({ value, onChange, max = 10 }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const add = (raw: string[]) => {
    const next = [...value]
    for (const part of raw) {
      const tag = part.trim().replace(/^#+/, '').toLowerCase()
      if (tag && !next.includes(tag) && next.length < max) next.push(tag)
    }
    if (next.length !== value.length) onChange(next)
  }

  const commit = () => {
    add([draft])
    setDraft('')
  }

  // Trocar de nota desmonta o editor sem blur: o que estava digitado vira tag
  // em vez de sumir. O salvamento automático envia mesmo depois da saída.
  const latest = useRef({ draft, add })
  useEffect(() => {
    latest.current = { draft, add }
  })
  useEffect(
    () => () => {
      const { draft: pending, add: addTags } = latest.current
      if (pending.trim()) addTags([pending])
    },
    [],
  )

  /** Vírgula ou espaço confirmam, venham de tecla, colagem ou autocompletar. */
  const handleChange = (text: string) => {
    const parts = text.split(/[,\s]+/)
    if (parts.length === 1) return setDraft(text)
    add(parts.slice(0, -1))
    setDraft(parts.at(-1) ?? '')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((tag) => (
        <span
          key={tag}
          className="flex h-6 items-center gap-1 rounded border border-border bg-elevated pr-1 pl-1.5 font-mono text-[11px] text-fg-muted"
        >
          #{tag}
          <button
            type="button"
            aria-label={`Remover a tag ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="grid size-4 place-items-center rounded text-fg-subtle hover:text-fg"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (['Enter', ',', ' '].includes(event.key)) {
              event.preventDefault()
              commit()
            } else if (event.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
          placeholder={value.length ? '' : 'Adicionar tag'}
          aria-label="Adicionar tag"
          maxLength={NOTE_LIMITS.tag}
          className="h-6 min-w-24 flex-1 bg-transparent font-mono text-[11px] placeholder:text-fg-subtle focus:outline-none"
        />
      )}
    </div>
  )
}
