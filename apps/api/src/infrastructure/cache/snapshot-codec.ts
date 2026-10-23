import type { Issue, PullRequest, WorkSnapshot } from '../../domain/work.js'

/**
 * Converte o retrato para JSON e de volta. A versão muda quando o formato do
 * retrato muda: um retrato salvo num formato antigo é ignorado (vira uma
 * busca nova), em vez de chegar quebrado ao painel.
 */
/** 2: PRs ganharam changesRequested. */
export const SNAPSHOT_VERSION = 2

interface Stored {
  version: number
  snapshot: unknown
}

export function encodeSnapshot(snapshot: WorkSnapshot): Stored {
  return { version: SNAPSHOT_VERSION, snapshot: JSON.parse(JSON.stringify(snapshot)) }
}

const date = (value: unknown) => {
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) throw new Error('data inválida no retrato guardado')
  return parsed
}

type Raw<T> = Omit<T, 'createdAt' | 'updatedAt' | 'mergedAt'> & Record<string, unknown>

const revivePullRequest = (pr: Raw<PullRequest>): PullRequest => ({
  ...(pr as unknown as PullRequest),
  createdAt: date(pr.createdAt),
  updatedAt: date(pr.updatedAt),
  mergedAt: pr.mergedAt ? date(pr.mergedAt) : null,
})

const reviveIssue = (issue: Raw<Issue>): Issue => ({
  ...(issue as unknown as Issue),
  createdAt: date(issue.createdAt),
  updatedAt: date(issue.updatedAt),
})

/** Devolve o retrato, ou nada se ele estiver noutro formato ou corrompido. */
export function decodeSnapshot(stored: unknown): WorkSnapshot | undefined {
  try {
    const { version, snapshot } = stored as Stored
    if (version !== SNAPSHOT_VERSION) return undefined
    const raw = snapshot as Record<string, unknown> & {
      reviewRequested: Raw<PullRequest>[]
      authored: Raw<PullRequest>[]
      merged: Raw<PullRequest>[]
      issues: Raw<Issue>[]
    }
    return {
      ...(raw as unknown as WorkSnapshot),
      fetchedAt: date(raw.fetchedAt),
      reviewRequested: raw.reviewRequested.map(revivePullRequest),
      authored: raw.authored.map(revivePullRequest),
      merged: raw.merged.map(revivePullRequest),
      issues: raw.issues.map(reviveIssue),
    }
  } catch {
    return undefined
  }
}
