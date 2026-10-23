/**
 * Toda chamada ao GitHub passa por aqui. O DevDesk só lê: este fetch recusa,
 * antes de sair da máquina, qualquer coisa que possa alterar um repositório
 * ou uma organização. O token tem escopo de escrita (OAuth Apps e PATs
 * classic não oferecem leitura só), então a garantia precisa estar no código.
 *
 * Permitido:
 *   - GET em api.github.com
 *   - POST em api.github.com/graphql, só com `query` (nunca `mutation`)
 *   - POST em github.com/login/oauth/access_token (login e renovação)
 */
export class GitHubWriteBlockedError extends Error {
  constructor(reason: string) {
    super(`Bloqueado: o DevDesk só lê do GitHub (${reason}).`)
    this.name = 'GitHubWriteBlockedError'
  }
}

const API = 'api.github.com'
const OAUTH_TOKEN_URL = 'https://github.com/login/oauth/access_token'

/** Remove comentários e espaços do início para achar a operação. */
function graphqlOperation(body: unknown): string {
  if (typeof body !== 'string') throw new GitHubWriteBlockedError('corpo GraphQL ilegível')
  let parsed: { query?: unknown }
  try {
    parsed = JSON.parse(body) as { query?: unknown }
  } catch {
    throw new GitHubWriteBlockedError('corpo GraphQL ilegível')
  }
  if (typeof parsed.query !== 'string') throw new GitHubWriteBlockedError('GraphQL sem query')
  return parsed.query.replace(/#[^\n]*/g, '').trim()
}

export function assertReadOnly(url: string, init: RequestInit = {}): void {
  const method = (init.method ?? 'GET').toUpperCase()
  const target = new URL(url)

  if (url === OAUTH_TOKEN_URL && method === 'POST') return

  if (target.host !== API) throw new GitHubWriteBlockedError(`destino ${target.host} não permitido`)
  if (method === 'GET' || method === 'HEAD') return

  if (method === 'POST' && target.pathname === '/graphql') {
    const operation = graphqlOperation(init.body)
    // Uma query pode começar por "query", por "{" (forma curta) ou por fragmentos.
    // Qualquer "mutation" ou "subscription" no documento é recusada.
    if (/\b(mutation|subscription)\b/.test(operation)) {
      throw new GitHubWriteBlockedError('mutation GraphQL')
    }
    if (/^(query\b|\{|fragment\b)/.test(operation)) return
    throw new GitHubWriteBlockedError('operação GraphQL desconhecida')
  }

  throw new GitHubWriteBlockedError(`${method} ${target.pathname}`)
}

export function createReadOnlyFetch(inner: typeof fetch = globalThis.fetch): typeof fetch {
  // async: um bloqueio vira promessa rejeitada, como qualquer falha de fetch.
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    assertReadOnly(url, init)
    return inner(input, init)
  }) as typeof fetch
}
