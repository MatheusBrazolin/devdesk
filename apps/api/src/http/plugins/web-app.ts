import fastifyStatic from '@fastify/static'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { sendNotFound } from './error-handler.js'

/**
 * Em produção, a própria API serve o front compilado: mesma origem, então o
 * cookie de sessão funciona sem CORS e há um só serviço para publicar.
 * - Arquivos de `assets/` têm hash no nome: cache de um ano.
 * - `index.html` nunca fica em cache, para uma versão nova chegar na hora.
 * - Rotas do app (`/notas`, `/calendario`...) devolvem o `index.html`; o
 *   roteador do front decide o resto. O que começa com `/api` continua JSON.
 */
export async function registerWebApp(app: FastifyInstance, root: string): Promise<void> {
  await app.register(fastifyStatic, {
    root,
    wildcard: false,
    index: false,
    // O cache é decidido abaixo, por tipo de arquivo.
    cacheControl: false,
    setHeaders: (reply, path) => {
      reply.header(
        'cache-control',
        path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      )
    },
  })

  const sendIndex = (reply: FastifyReply) =>
    reply.header('cache-control', 'no-cache').sendFile('index.html')

  app.get('/', (_request, reply) => sendIndex(reply))

  app.setNotFoundHandler((request, reply) => {
    const isPage =
      request.method === 'GET' &&
      !request.url.startsWith('/api') &&
      (request.headers.accept ?? '').includes('text/html')
    return isPage ? sendIndex(reply) : sendNotFound(reply)
  })
}
