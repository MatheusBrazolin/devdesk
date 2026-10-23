import { Kind, OperationTypeNode, parse } from 'graphql'

/**
 * Toda chamada ao GitHub passa por aqui. O DevDesk só lê: este fetch recusa,
 * antes de sair da máquina, qualquer coisa que possa alterar um repositório
 * ou uma organização. O token tem escopo de escrita (OAuth Apps e PATs
 * classic não oferecem leitura só), então a garantia precisa estar no código.
 *
 * Permitido:
 *   - GET em https://api.github.com
 *   - POST em https://api.github.com/graphql, só com operações `query`
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

/**
 * Lê o documento com o parser oficial do GraphQL, não com expressão regular:
 * um "#" dentro de uma string ou um comentário não esconde uma mutation.
 * Só operações `query` e fragmentos passam.
 */
function assertQueryDocument(body: unknown): void {
  if (typeof body !== 'string') throw new GitHubWriteBlockedError('corpo GraphQL ilegível')
  let parsed: { query?: unknown }
  try {
    parsed = JSON.parse(body) as { query?: unknown }
  } catch {
    throw new GitHubWriteBlockedError('corpo GraphQL ilegível')
  }
  // Sem `query` (ex.: persisted query só com `extensions`) não dá para conferir.
  if (typeof parsed.query !== 'string') throw new GitHubWriteBlockedError('GraphQL sem query')

  let document
  try {
    document = parse(parsed.query)
  } catch {
    throw new GitHubWriteBlockedError('GraphQL inválido')
  }
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) continue
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      throw new GitHubWriteBlockedError('definição GraphQL não permitida')
    }
    if (definition.operation !== OperationTypeNode.QUERY) {
      throw new GitHubWriteBlockedError(`${definition.operation} GraphQL`)
    }
  }
}

export function assertReadOnly(url: string, init: RequestInit = {}): void {
  const method = (init.method ?? 'GET').toUpperCase()
  const target = new URL(url)

  // O token vai no cabeçalho: nunca por HTTP sem TLS.
  if (target.protocol !== 'https:') throw new GitHubWriteBlockedError('só HTTPS')
  if (url === OAUTH_TOKEN_URL && method === 'POST') return

  if (target.host !== API) throw new GitHubWriteBlockedError(`destino ${target.host} não permitido`)
  if (method === 'GET' || method === 'HEAD') return

  if (method === 'POST' && target.pathname === '/graphql') return assertQueryDocument(init.body)

  throw new GitHubWriteBlockedError(`${method} ${target.pathname}`)
}

export function createReadOnlyFetch(inner: typeof fetch = globalThis.fetch): typeof fetch {
  // async: um bloqueio vira promessa rejeitada, como qualquer falha de fetch.
  return (async (input: string | URL | Request, init?: RequestInit) => {
    // Um Request carrega método e corpo próprios, que não dá para conferir de forma
    // síncrona. O código do DevDesk não usa Request; recusar fecha a brecha.
    if (input instanceof Request) throw new GitHubWriteBlockedError('Request não suportado')
    const url = typeof input === 'string' ? input : input.href
    assertReadOnly(url, init)
    return inner(input, init)
  }) as typeof fetch
}
