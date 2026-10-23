import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

/**
 * Parâmetros que só o libpq (psql) entende. O driver repassa ao servidor o
 * que não conhece, e o Postgres recusa a conexão por parâmetro desconhecido.
 * O Neon, por exemplo, entrega a URL com `channel_binding=require`.
 */
const LIBPQ_ONLY = ['channel_binding', 'gssencmode', 'target_session_attrs']

/** A URL como o provedor entrega, sem o que o driver não aceita. */
export function connectionUrl(url: string): string {
  if (!url.includes('?')) return url
  const parsed = new URL(url)
  for (const param of LIBPQ_ONLY) parsed.searchParams.delete(param)
  return parsed.toString()
}

export function createDatabase(url: string) {
  const sql = postgres(connectionUrl(url), { max: 10 })
  return { db: drizzle(sql, { schema }), close: () => sql.end() }
}

export type Database = ReturnType<typeof createDatabase>['db']
