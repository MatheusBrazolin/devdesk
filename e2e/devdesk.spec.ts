import { expect, type Page, test } from '@playwright/test'

/**
 * O DevDesk usado como um visitante usaria: o app compilado, servido pela
 * API, no modo demonstração. Cada teste entra numa visita nova (um usuário
 * demo próprio), então nada vaza de um teste para outro.
 */

async function enterDemo(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Ver a demonstração' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Visitante')
}

test.describe('entrada', () => {
  test('sem GitHub configurado, o login oferece só a demonstração', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Ver a demonstração' })).toBeVisible()
    await expect(page.getByRole('button', { name: /GitHub/ })).toHaveCount(0)
    await expect(page.getByText('demonstração pública')).toBeVisible()
    // A instrução de configuração é só para quem desenvolve.
    await expect(page.getByText('GITHUB_CLIENT_ID')).toHaveCount(0)
  })

  test('página protegida sem sessão volta para o login', async ({ page }) => {
    await page.goto('/notas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('entra na demonstração e sai', async ({ page }) => {
    await enterDemo(page)
    await expect(page.getByText('demonstração', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Visitante/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('painel Hoje', () => {
  test('mostra os indicadores e a fila de atenção', async ({ page }) => {
    await enterDemo(page)
    const indicators = page.getByRole('region', { name: 'Indicadores' })
    for (const label of ['Reviews pedidas', 'Seus PRs abertos', 'Issues atribuídas', 'Mergeados'])
      await expect(indicators.getByText(label)).toBeVisible()
    await expect(page.getByText('Precisa da sua atenção')).toBeVisible()
    // O selo existe em duas versões (celular e tela larga): vale a visível.
    await expect(page.getByText('review pedida').filter({ visible: true }).first()).toBeVisible()
  })

  test('numa tela de notebook, cabe inteiro sem rolar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await enterDemo(page)
    await expect(page.getByText('Mergeados por dia')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('no celular, nenhuma página rola para o lado', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await enterDemo(page)
    for (const path of ['/', '/pull-requests', '/issues', '/notas', '/calendario', '/standup']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const wide = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
      expect(wide, `${path} rola para o lado`).toBe(false)
    }
  })
})

test.describe('notas', () => {
  test('cria, salva sozinha, sobrevive a recarregar e apaga', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/notas')
    await page.getByRole('button', { name: 'Nova' }).first().click()

    await page.getByLabel('Título').fill('Checklist do deploy')
    await page.getByLabel('Conteúdo da nota').fill('- [ ] migrar o banco\n- [ ] avisar o time')
    await expect(page.getByText('Salvo agora')).toBeVisible({ timeout: 10_000 })

    await page.reload()
    await expect(page.getByLabel('Título')).toHaveValue('Checklist do deploy')

    await page.getByRole('button', { name: 'Apagar' }).click()
    await page
      .getByRole('button', { name: /Apagar/ })
      .last()
      .click()
    await expect(page.getByText('Checklist do deploy')).toHaveCount(0)
  })

  test('uma visita não vê as notas de outra', async ({ browser }) => {
    const first = await browser.newPage()
    await enterDemo(first)
    await first.goto('/notas')
    await first.getByRole('button', { name: 'Nova' }).first().click()
    await first.getByLabel('Título').fill('Só desta visita')
    await expect(first.getByText('Salvo agora')).toBeVisible({ timeout: 10_000 })

    const second = await browser.newPage()
    await enterDemo(second)
    await second.goto('/notas')
    await expect(second.getByText('Nenhuma nota ainda')).toBeVisible()
    await expect(second.getByText('Só desta visita')).toHaveCount(0)
    await Promise.all([first.close(), second.close()])
  })
})

test.describe('calendário', () => {
  test('cria um evento e apaga com confirmação', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/calendario')
    await page.getByRole('button', { name: 'Novo evento', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Título').fill('Planning da sprint')
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog).toBeHidden()

    await page
      .getByRole('button', { name: /Planning da sprint/ })
      .first()
      .click()
    await page.getByRole('dialog').getByRole('button', { name: 'Apagar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar: apagar' }).click()
    await expect(page.getByRole('button', { name: /Planning da sprint/ })).toHaveCount(0)
  })

  test('exporta a agenda em .ics', async ({ page }) => {
    await enterDemo(page)
    const response = await page.request.get('/api/calendar.ics')
    expect(response.ok()).toBe(true)
    expect(await response.text()).toContain('BEGIN:VCALENDAR')
  })
})

test.describe('navegação', () => {
  test('a paleta de comandos leva às páginas', async ({ page }) => {
    await enterDemo(page)
    await page.getByRole('button', { name: /Ir para/ }).click()
    await page.keyboard.type('Issues')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/issues/)
    await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible()
  })

  test('g + tecla navega, como no GitHub', async ({ page }) => {
    await enterDemo(page)
    await page.keyboard.press('g')
    await page.keyboard.press('p')
    await expect(page).toHaveURL(/\/pull-requests/)
  })
})

test.describe('foco e modo TV', () => {
  test('o cronômetro do foco começa, conta e zera', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/foco')
    await expect(page.getByRole('timer')).toHaveText('25:00')
    await page.getByRole('button', { name: 'Começar' }).click()
    await expect(page.getByRole('timer')).not.toHaveText('25:00', { timeout: 5_000 })
    await page.getByRole('button', { name: 'Zerar' }).click()
    await expect(page.getByRole('timer')).toHaveText('25:00')
  })

  for (const [name, width, height, query] of [
    ['grade numa TV Full HD', 1920, 1080, ''],
    ['coluna numa janela estreita', 440, 1000, '?layout=coluna'],
    ['faixa numa tira larga', 1920, 300, ''],
  ] as const) {
    test(`modo TV em ${name}: nada rola nem corta`, async ({ page }) => {
      await enterDemo(page)
      await page.setViewportSize({ width, height })
      await page.goto(`/tv${query}`)
      await expect(page.getByRole('region', { name: 'Indicadores' })).toBeVisible()
      const problems = await page.evaluate(() => ({
        rolagem:
          document.documentElement.scrollWidth > window.innerWidth ||
          document.documentElement.scrollHeight > window.innerHeight,
        cortados: [...document.querySelectorAll('section')].filter(
          (section) => section.getBoundingClientRect().bottom > window.innerHeight + 1,
        ).length,
      }))
      expect(problems).toEqual({ rolagem: false, cortados: 0 })
    })
  }
})

test.describe('tema', () => {
  test('troca com transição, sem acender a tela de uma vez, e fica salvo', async ({ page }) => {
    await enterDemo(page)
    const startedTransition = page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const original = document.startViewTransition.bind(document)
          document.startViewTransition = (update) => {
            resolve(true)
            return original(update)
          }
        }),
    )
    const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))

    await page.getByRole('button', { name: /Visitante/ }).click()
    await page.getByRole('menuitemradio', { name: wasDark ? 'Claro' : 'Escuro' }).click()

    expect(await startedTransition).toBe(true)
    await expect(page.locator('html')).toHaveClass(wasDark ? /^(?!.*\bdark\b)/ : /\bdark\b/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(wasDark ? /^(?!.*\bdark\b)/ : /\bdark\b/)
  })
})

test.describe('versão nova', () => {
  /** Faz o servidor "publicar" um build novo: o index passa a apontar outro script. */
  async function publishNewBuild(page: Page) {
    const html = await (await page.request.get('/')).text()
    const newer = html.replace(/\/assets\/index-[^"]+\.js/, '/assets/index-novaversao.js')
    await page.route('**/', (route) => route.fulfill({ body: newer, contentType: 'text/html' }), {
      times: 1,
    })
  }

  test('aba aberta avisa que saiu versão nova e recarrega no clique', async ({ page }) => {
    await enterDemo(page)
    await publishNewBuild(page)
    // Voltar para a aba dispara a conferência.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.getByText('Nova versão do DevDesk disponível')).toBeVisible()

    const reloaded = page.waitForEvent('load')
    await page.getByRole('button', { name: 'Recarregar' }).click()
    await reloaded
  })

  test('sem versão nova, nada aparece', async ({ page }) => {
    await enterDemo(page)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await page.waitForTimeout(1_000)
    await expect(page.getByText('Nova versão do DevDesk disponível')).toHaveCount(0)
  })

  test('o modo TV, que ninguém está mexendo, recarrega sozinho', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/tv')
    await expect(page.getByRole('region', { name: 'Indicadores' })).toBeVisible()
    await publishNewBuild(page)
    const reloaded = page.waitForEvent('load')
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await reloaded
    await expect(page).toHaveURL(/\/tv/)
  })
})

test.describe('abas sincronizadas', () => {
  test('o modo TV aberto ao lado muda quando outra aba recebe dados novos', async ({ context }) => {
    const main = await context.newPage()
    await enterDemo(main)

    // A TV começa com um retrato antigo, em que a fila estava vazia.
    const tv = await context.newPage()
    await tv.route(
      '**/api/dashboard',
      async (route) => {
        const response = await route.fetch()
        const old = await response.json()
        await route.fulfill({
          response,
          json: { ...old, attention: [], fetchedAt: '2026-01-01T00:00:00.000Z' },
        })
      },
      { times: 1 },
    )
    await tv.goto('/tv')
    // Fila vazia no modo TV: no lugar dela entram os seus PRs abertos.
    await expect(tv.getByText('nada pede atenção')).toBeVisible()

    // Na outra aba, alguém atualiza: a TV recebe na hora, sem recarregar.
    await main.getByRole('button', { name: 'Atualizar agora' }).click()
    await expect(tv.getByText('Precisa de atenção')).toBeVisible()
    await expect(tv.getByText('review pedida').first()).toBeVisible()
    await expect(tv.getByText('nada pede atenção')).toHaveCount(0)
  })
})
