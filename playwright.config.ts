import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta: o app sobe como em produção (build compilado, a
 * API servindo o front, modo demonstração, nenhuma credencial do GitHub) e o
 * navegador o usa como um visitante. Rode `npm run build` antes.
 */
const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // O service worker passaria por cima das interceptações de rede dos testes;
    // o grupo do app instalável liga ele de volta.
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node apps/api/dist/main.js',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(PORT),
      WEB_DIST_DIR: 'apps/web/dist',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://devdesk:devdesk@localhost:5432/devdesk',
      // Chave só de teste: cifra tokens que estes testes nem chegam a criar.
      TOKEN_ENCRYPTION_KEY: 'ZGV2ZGVzay1lMmUtY2hhdmUtZGUtdGVzdGUtMzJieXQ=',
      DEMO_ENABLED: 'true',
      WEB_ORIGIN: BASE_URL,
      API_PUBLIC_URL: `${BASE_URL}/api`,
      LOG_LEVEL: 'warn',
      // Todos os testes vêm do mesmo 127.0.0.1, em paralelo.
      RATE_LIMIT_PER_MINUTE: '10000',
    },
  },
})
