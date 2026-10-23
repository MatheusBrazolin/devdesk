import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { Database } from './client.js'

const migrationsFolder = fileURLToPath(new URL('../../../drizzle', import.meta.url))

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder })
}

// Permite rodar direto: npm run db:migrate
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createDatabase } = await import('./client.js')
  const { db, close } = createDatabase(
    process.env.DATABASE_URL ?? 'postgres://devdesk:devdesk@localhost:5432/devdesk',
  )
  await runMigrations(db)
  await close()
  console.log('Migrações aplicadas.')
}
