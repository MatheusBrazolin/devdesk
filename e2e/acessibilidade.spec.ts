import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

/**
 * Acessibilidade (WCAG 2.1 AA, pelo axe) em todas as páginas, nos dois temas.
 * Com movimento reduzido e esperando as entradas terminarem: o axe mede a cor
 * do jeito que está na tela, e um texto no meio do esmaecimento não conta.
 */

const PAGES = [
  '/',
  '/foco',
  '/pull-requests?aba=meus',
  '/issues',
  '/notas',
  '/calendario',
  '/standup',
  '/metricas',
  '/time',
  '/tv',
]

async function violations(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1_200)
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze()
  return violations.map(
    (v) => `${v.impact} · ${v.id}: ${v.nodes.length}× ${JSON.stringify(v.nodes[0]?.target)}`,
  )
}

for (const theme of ['light', 'dark'] as const) {
  test(`sem violações de acessibilidade, tema ${theme === 'light' ? 'claro' : 'escuro'}`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => localStorage.setItem('devdesk:boas-vindas', 'visto'))
    await page.goto('/login')
    await page.evaluate((value) => localStorage.setItem('devdesk:theme', value), theme)
    await page.reload()
    expect(await violations(page), '/login').toEqual([])

    await page.getByRole('button', { name: 'Ver a demonstração' }).click()
    await page.waitForURL('**/')
    for (const path of PAGES) {
      await page.goto(path)
      expect(await violations(page), path).toEqual([])
    }
  })
}
