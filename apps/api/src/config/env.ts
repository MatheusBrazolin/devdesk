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
    WEB_ORIGIN: z.url().optional(),
    /** Endereço público da API, usado para montar a URL de callback do OAuth. */
    API_PUBLIC_URL: z.url().optional(),
    /**
     * Endereço público que o Render dá ao serviço. Sem WEB_ORIGIN e
     * API_PUBLIC_URL, vale ele: o nome do serviço pode mudar sem mexer em nada.
     */
    RENDER_EXTERNAL_URL: z.url().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    /** 32 bytes em base64. Cifra o token do GitHub guardado no banco. */
    TOKEN_ENCRYPTION_KEY: z.string().refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'precisa ter 32 bytes em base64 (gere com: openssl rand -base64 32)',
    }),
    /**
     * Token pessoal (PAT classic) do dono. Age como ele, então enxerga
     * repositórios de organizações que bloqueiam OAuth Apps. Local: login
     * direto ("Entrar como"). Em produção o login direto não existe; o dono
     * entra pelo OAuth, que prova quem é, e os dados vêm deste token.
     */
    GITHUB_PERSONAL_TOKEN: z.string().optional(),
    DEMO_ENABLED: booleanFromString.optional(),
    /**
     * Quantos proxies reversos há na frente da API (ex.: 1). Com isso o IP real
     * de quem pede vem do X-Forwarded-For, e o limite de requisições passa a ser
     * por pessoa, não um só para todo mundo atrás do proxy.
     */
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    /**
     * Requisições por minuto por IP. Os testes de ponta a ponta sobem o valor:
     * rodam em paralelo, todos do mesmo 127.0.0.1.
     */
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(300),
    /** Entradas na demonstração por minuto por IP: cada uma cria uma conta no banco. */
    DEMO_LOGINS_PER_MINUTE: z.coerce.number().int().positive().default(10),
    /**
     * Chaves VAPID dos avisos com o app fechado (gere com: npx web-push
     * generate-vapid-keys). Sem elas, os avisos funcionam só com o app aberto.
     */
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    /** Contato do dono do servidor, exigido pelos serviços de push (mailto: ou https:). */
    VAPID_SUBJECT: z.string().optional(),
    /** Segredo que o agendador (GitHub Actions) manda para disparar a rodada de avisos. */
    PUSH_CRON_SECRET: z.string().min(32, 'use pelo menos 32 caracteres').optional(),
    /** Pasta do front compilado; com ela, a API serve o app inteiro (produção). */
    WEB_DIST_DIR: z.string().optional(),
  })
  .transform((env) => {
    const publicUrl = env.RENDER_EXTERNAL_URL?.replace(/\/+$/, '')
    return {
      ...env,
      WEB_ORIGIN: env.WEB_ORIGIN ?? publicUrl ?? 'http://localhost:5173',
      API_PUBLIC_URL:
        env.API_PUBLIC_URL ?? (publicUrl ? `${publicUrl}/api` : 'http://localhost:5173/api'),
      DEMO_ENABLED: env.DEMO_ENABLED ?? env.NODE_ENV !== 'production',
      pushEnabled: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      githubLoginEnabled: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      // Quem chega na API entra como o dono do token: nunca num servidor público.
      // Com proxy, o IP vem de um cabeçalho que dá para forjar: o modo pessoal, que
      // confia no IP local, fica desligado.
      personalTokenEnabled:
        Boolean(env.GITHUB_PERSONAL_TOKEN) &&
        env.NODE_ENV !== 'production' &&
        env.TRUST_PROXY === 0,
    }
  })

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
