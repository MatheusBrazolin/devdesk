import { NOTE_LIMITS } from '@devdesk/shared'

export interface NoteLink {
  kind: 'pull_request' | 'issue'
  repository: string
  number: number
  url: string
  title: string
}

export interface Note {
  id: string
  userId: string
  title: string
  body: string
  tags: string[]
  pinned: boolean
  links: NoteLink[]
  createdAt: Date
  updatedAt: Date
}

export const UNTITLED = 'Sem título'

/**
 * Tags sem distinção de maiúsculas, sem "#" na frente, sem espaços nas
 * pontas e sem repetição. "Bug", "#bug" e " bug " são a mesma tag, e
 * "deploy,#infra" vira duas.
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  // Vírgula separa tags mesmo dentro de uma string só ("deploy,infra").
  for (const raw of tags.flatMap((tag) => tag.split(','))) {
    const tag = raw.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase()
    if (tag && tag.length <= NOTE_LIMITS.tag) seen.add(tag)
  }
  return [...seen].slice(0, NOTE_LIMITS.tags)
}

/**
 * Título efetivo: o informado ou, se vazio, a primeira linha com texto do
 * corpo, sem a marcação de cabeçalho do markdown.
 */
export function resolveTitle(title: string, body: string): string {
  const explicit = title.trim()
  if (explicit) return explicit.slice(0, NOTE_LIMITS.title)
  const firstLine = body
    .split('\n')
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
    .find(Boolean)
  return firstLine ? firstLine.slice(0, 80) : UNTITLED
}

/** Um mesmo PR ou issue entra uma vez só. */
export function dedupeLinks(links: NoteLink[]): NoteLink[] {
  const byUrl = new Map<string, NoteLink>()
  for (const link of links) if (!byUrl.has(link.url)) byUrl.set(link.url, link)
  return [...byUrl.values()]
}
