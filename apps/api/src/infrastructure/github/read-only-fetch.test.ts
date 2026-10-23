import { describe, expect, it } from 'vitest'
import { DASHBOARD_QUERIES } from './dashboard-query.js'
import { assertReadOnly, createReadOnlyFetch, GitHubWriteBlockedError } from './read-only-fetch.js'

const graphql = (query: string) => ({ method: 'POST', body: JSON.stringify({ query }) })

describe('assertReadOnly', () => {
  it('libera leitura REST', () => {
    expect(() => assertReadOnly('https://api.github.com/user')).not.toThrow()
    expect(() =>
      assertReadOnly('https://api.github.com/repos/umbrella/workers/pulls', {
        method: 'GET',
      }),
    ).not.toThrow()
  })

  it.each(Object.entries(DASHBOARD_QUERIES))('libera a consulta do painel: %s', (_list, query) => {
    expect(() => assertReadOnly('https://api.github.com/graphql', graphql(query))).not.toThrow()
  })

  it('libera a forma curta de query', () => {
    expect(() =>
      assertReadOnly('https://api.github.com/graphql', graphql('{ viewer { login } }')),
    ).not.toThrow()
  })

  it('libera o login e a renovação do OAuth', () => {
    expect(() =>
      assertReadOnly('https://github.com/login/oauth/access_token', { method: 'POST', body: '{}' }),
    ).not.toThrow()
  })

  it.each([
    [
      'comentar num PR',
      'POST',
      'https://api.github.com/repos/umbrella/workers/issues/136/comments',
    ],
    ['fazer merge', 'PUT', 'https://api.github.com/repos/umbrella/workers/pulls/136/merge'],
    ['editar uma issue', 'PATCH', 'https://api.github.com/repos/globex/quotes-api/issues/710'],
    [
      'apagar um branch',
      'DELETE',
      'https://api.github.com/repos/umbrella/workers/git/refs/heads/x',
    ],
  ])('bloqueia %s', (_what, method, url) => {
    expect(() => assertReadOnly(url, { method, body: '{}' })).toThrow(GitHubWriteBlockedError)
  })

  it('bloqueia mutation GraphQL (ex.: aprovar um PR)', () => {
    const mutation =
      'mutation { addPullRequestReview(input: {pullRequestId: "x", event: APPROVE}) { clientMutationId } }'
    expect(() => assertReadOnly('https://api.github.com/graphql', graphql(mutation))).toThrow(
      /mutation/,
    )
  })

  it('bloqueia mutation escondida depois de um comentário ou de uma query', () => {
    expect(() =>
      assertReadOnly('https://api.github.com/graphql', graphql('# só leitura\nmutation { x }')),
    ).toThrow(GitHubWriteBlockedError)
    expect(() =>
      assertReadOnly('https://api.github.com/graphql', graphql('query { a } mutation { b }')),
    ).toThrow(GitHubWriteBlockedError)
  })

  it('bloqueia mutation escondida atrás de um # dentro de uma string', () => {
    const query =
      'query A { search(query: "#", type: REPOSITORY, first: 1) { repositoryCount } } mutation B { addStar(input: {starrableId: "x"}) { clientMutationId } }'
    expect(() =>
      assertReadOnly('https://api.github.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ query, operationName: 'B' }),
      }),
    ).toThrow(/mutation/)
  })

  it('bloqueia mutation atrás de block string com #', () => {
    const query =
      'query A { search(query: """#""", type: REPOSITORY, first: 1) { repositoryCount } } mutation { x }'
    expect(() => assertReadOnly('https://api.github.com/graphql', graphql(query))).toThrow(
      GitHubWriteBlockedError,
    )
  })

  it('bloqueia subscription e GraphQL inválido', () => {
    expect(() =>
      assertReadOnly('https://api.github.com/graphql', graphql('subscription { x }')),
    ).toThrow(/subscription/)
    expect(() => assertReadOnly('https://api.github.com/graphql', graphql('query {'))).toThrow(
      /inválido/,
    )
  })

  it('bloqueia persisted query sem o texto da consulta', () => {
    expect(() =>
      assertReadOnly('https://api.github.com/graphql', {
        method: 'POST',
        body: JSON.stringify({ extensions: { persistedQuery: { sha256Hash: 'x' } } }),
      }),
    ).toThrow(/sem query/)
  })

  it('bloqueia HTTP sem TLS, que mandaria o token às claras', () => {
    expect(() => assertReadOnly('http://api.github.com/user')).toThrow(/HTTPS/)
  })

  it('bloqueia corpo GraphQL que não dá para ler', () => {
    expect(() =>
      assertReadOnly('https://api.github.com/graphql', { method: 'POST', body: 'x' }),
    ).toThrow(GitHubWriteBlockedError)
  })

  it('bloqueia outros destinos', () => {
    expect(() => assertReadOnly('https://uploads.github.com/repos/x/y/releases/1/assets')).toThrow(
      GitHubWriteBlockedError,
    )
  })
})

describe('createReadOnlyFetch', () => {
  it('recusa objetos Request, cujo método não é conferido', async () => {
    let sent = 0
    const guarded = createReadOnlyFetch((async () => {
      sent += 1
      return new Response('{}')
    }) as unknown as typeof fetch)
    await expect(
      guarded(new Request('https://api.github.com/repos/o/r', { method: 'DELETE' })),
    ).rejects.toThrow(GitHubWriteBlockedError)
    expect(sent).toBe(0)
  })

  it('não deixa a requisição de escrita sair', async () => {
    let sent = 0
    const inner = (async () => {
      sent += 1
      return new Response('{}')
    }) as unknown as typeof fetch
    const guarded = createReadOnlyFetch(inner)

    await expect(
      guarded('https://api.github.com/repos/a/b/issues/1/comments', { method: 'POST', body: '{}' }),
    ).rejects.toThrow(GitHubWriteBlockedError)
    expect(sent).toBe(0)

    await guarded('https://api.github.com/user')
    expect(sent).toBe(1)
  })
})
