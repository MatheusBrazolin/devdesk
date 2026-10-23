import { z } from 'zod'

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true')

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().positive().default(3333),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.string().default('postgres://devdesk:devdesk@localhost:5432/devdesk'),
    /** Endereço do front; o login termina redirecionando para cá. */
    WEB_ORIGIN: z.url().default('http://localhost:5173'),
    /** Endereço público da API, usado para montar a URL de callback do OAuth. */
    API_PUBLIC_URL: z.url().default('http://localhost:5173/api'),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    /** 32 bytes em base64. Cifra o token do GitHub guardado no banco. */
    TOKEN_ENCRYPTION_KEY: z.string().refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'precisa ter 32 bytes em base64 (gere com: openssl rand -base64 32)',
    }),
    /**
     * Token pessoal (PAT classic) para o modo de uma pessoa só. Age como você,
     * então enxerga repositórios de organizações que bloqueiam OAuth Apps.
     */
    GITHUB_PERSONAL_TOKEN: z.string().optional(),
    DEMO_ENABLED: booleanFromString.optional(),
  })
  .transform((env) => ({
    ...env,
    DEMO_ENABLED: env.DEMO_ENABLED ?? env.NODE_ENV !== 'production',
    githubLoginEnabled: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    // Quem chega na API entra como o dono do token: nunca num servidor público.
    personalTokenEnabled: Boolean(env.GITHUB_PERSONAL_TOKEN) && env.NODE_ENV !== 'production',
  }))

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`)
  }
  return parsed.data
}
