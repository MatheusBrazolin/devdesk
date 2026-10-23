import { loadEnv } from './config/env.js'
import { createContainer } from './container.js'
import { buildApp } from './http/app.js'
import { createDatabase } from './infrastructure/db/client.js'
import { runMigrations } from './infrastructure/db/migrate.js'

const env = loadEnv()
const { db, close } = createDatabase(env.DATABASE_URL)
await runMigrations(db)

const app = await buildApp(createContainer(env, db), {
  logger: {
    level: env.LOG_LEVEL,
    ...(env.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
  },
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close()
    await close()
    process.exit(0)
  })
}

await app.listen({ host: env.HOST, port: env.PORT })
