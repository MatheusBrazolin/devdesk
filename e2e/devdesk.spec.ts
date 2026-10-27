import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'

/**
 * O DevDesk usado como um visitante usaria: o app compilado, servido pela
 * API, no modo demonstração. Cada teste entra numa visita nova (um usuário
 * demo próprio), então nada vaza de um teste para outro.
 */

/** Pula o tour de primeiros passos: ele tem o próprio teste. */
async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('devdesk:boas-vindas', 'visto')
    } catch {
      // Página sem armazenamento: o teste segue.
    }
  })
}

async function enterDemo(page: Page) {
  await skipWelcome(page)
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
  test('mostra os números do dia e o quadro de PRs por situação', async ({ page }) => {
    await enterDemo(page)
    for (const label of [
      'Reviews pedidas',
      'PRs abertos',
      'Issues com você',
      'Mergeados em 7 dias',
    ])
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    for (const column of [
      'Precisa de você',
      'Parados há +7 dias',
      'Em andamento',
      'Mergeados na semana',
    ])
      await expect(page.getByRole('region', { name: column })).toBeVisible()
    const needsYou = page.getByRole('region', { name: 'Precisa de você' })
    await expect(needsYou.getByText('Review pedida').first()).toBeVisible()
    // O card inteiro é o link para o PR no GitHub.
    await expect(needsYou.getByRole('link').first()).toHaveAttribute('href', /github\.com/)
  })

  test('a navegação em pílula marca o Hoje e leva às outras páginas', async ({ page }) => {
    await enterDemo(page)
    const nav = page.getByRole('navigation', { name: 'Navegação principal' })
    await expect(nav.getByRole('link', { name: 'Hoje' })).toHaveAttribute('aria-current', 'page')
    await nav.getByRole('link', { name: 'Time' }).click()
    await expect(page).toHaveURL(/\/time/)
    await page.goto('/')
    await page.getByRole('button', { name: 'Ir para…' }).click()
    await expect(page.getByPlaceholder(/Busque PRs/)).toBeFocused()
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
    await page.getByRole('button', { name: 'Começar', exact: true }).click()
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

test.describe('visual', () => {
  test('o Quadro é sempre escuro e o menu não oferece outro tema', async ({ page }) => {
    await enterDemo(page)
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(background).toBe('rgb(14, 23, 19)')
    await page.getByRole('button', { name: /Menu de Visitante/ }).click()
    await expect(page.getByRole('menuitemradio', { name: 'Claro' })).toHaveCount(0)
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

test.describe('app instalável', () => {
  test.use({ serviceWorkers: 'allow' })

  test('tem manifesto, ícones e atalhos', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest')
    expect(response.ok()).toBe(true)
    const manifest = await response.json()
    expect(manifest).toMatchObject({ name: 'DevDesk', display: 'standalone', start_url: '/' })
    expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(
      true,
    )
    expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toContain('/tv?layout=coluna')
    for (const icon of manifest.icons) {
      const image = await page.request.get(icon.src)
      expect(image.headers()['content-type'], icon.src).toBe('image/png')
    }
  })

  test('o service worker assume a página e nunca guarda os dados da conta', async ({ page }) => {
    await enterDemo(page)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true)

    const cached = await page.evaluate(async () => {
      const urls: string[] = []
      for (const name of await caches.keys()) {
        const cache = await caches.open(name)
        urls.push(...(await cache.keys()).map((request) => new URL(request.url).pathname))
      }
      return urls
    })
    expect(cached.some((path) => path.startsWith('/assets/'))).toBe(true)
    expect(cached.some((path) => path.startsWith('/api/'))).toBe(false)
  })

  test('o Chrome considera o DevDesk instalável', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'a verificação usa o protocolo do Chrome')
    await enterDemo(page)
    await page.evaluate(() => navigator.serviceWorker.ready)
    const cdp = await page.context().newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    expect(installabilityErrors).toEqual([])
  })

  test('a página vem sempre da rede: versão nova chega no recarregar', async ({ page }) => {
    await enterDemo(page)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    const served = await (await page.request.get('/')).text()
    const loaded = await page.evaluate(
      () => document.querySelector('script[type="module"]')?.getAttribute('src') ?? '',
    )
    expect(served).toContain(loaded)
  })
})

test.describe('fila de review', () => {
  test('ordena pelo que destrava mais gente e mostra espera e tempo estimado', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/pull-requests?aba=review')
    await expect(page.getByLabel('Ordenar')).toHaveValue('prioridade')

    const rows = page
      .getByRole('main')
      .getByRole('listitem')
      .filter({ has: page.getByRole('link') })
    // A atrasada (30 h) primeiro, a pequena e recente depois, o rascunho por último.
    await expect(rows.nth(0)).toContainText('Retentativa com backoff')
    await expect(rows.nth(0)).toContainText('esperando há 1 d')
    await expect(rows.nth(0)).toContainText('~55 min')
    await expect(rows.nth(1)).toContainText('Extrai o formulário')
    await expect(rows.nth(2)).toContainText('Tokens de cor')
  })
})

test.describe('lembrete de PR parado', () => {
  test('copia uma mensagem pronta citando quem falta revisar', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await enterDemo(page)
    await page
      .getByRole('button', { name: /Copiar lembrete para quem revisa acme\/infra#84/ })
      .click()
    await expect(page.getByText('Lembrete copiado')).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain('@rafael-lima, @time-infra')
    expect(copied).toContain('acme/infra#84')
    expect(copied).toContain('há 9 dias')
    expect(copied).toContain('https://github.com/acme/infra/pull/84')
  })
})

test.describe('primeiros passos', () => {
  test('o tour aparece na primeira visita, anda até o fim e não volta sozinho', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Ver a demonstração' }).click()
    const tour = page.getByRole('dialog')
    await expect(tour.getByRole('heading', { name: 'Comece pelo Hoje' })).toBeVisible()
    for (const title of ['Notas, agenda e standup', 'Deixe à vista', 'Pelo teclado']) {
      await tour.getByRole('button', { name: 'Próximo' }).click()
      await expect(tour.getByRole('heading', { name: title })).toBeVisible()
    }
    await tour.getByRole('button', { name: 'Começar' }).click()
    await expect(tour).toBeHidden()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Visitante')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // E volta pelo menu quando a pessoa quiser.
    await page.getByRole('button', { name: /Visitante/ }).click()
    await page.getByRole('menuitem', { name: 'Primeiros passos' }).click()
    await expect(page.getByRole('heading', { name: 'Comece pelo Hoje' })).toBeVisible()
  })

  test('cria uma nota a partir do modelo de checklist de review', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/notas')
    await page.getByRole('button', { name: 'Nova nota a partir de um modelo' }).click()
    await page.getByRole('menuitem', { name: /Checklist de review/ }).click()
    await expect(page.getByLabel('Título')).toHaveValue('Review de PR')
    // Com conteúdo, a nota abre já formatada (modo de leitura).
    await expect(page.getByText('Erros tratados (rede, entrada inválida, vazio)')).toBeVisible()
  })
})

test.describe('minhas métricas', () => {
  test('mostra as oito semanas com totais e gráficos', async ({ page }) => {
    await enterDemo(page)
    await page.keyboard.press('g')
    await page.keyboard.press('m')
    await expect(page).toHaveURL(/\/metricas/)
    await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
    for (const label of ['PRs mergeados', 'Até o merge', 'Até a 1ª review', 'Reviews feitas'])
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    await expect(page.getByText('Mergeados por semana')).toBeVisible()
    // Oito colunas por gráfico, uma por semana.
    await expect(page.getByRole('button', { name: /semana de .*PRs? mergeados?/ })).toHaveCount(8)
  })
})

test.describe('agendas conectadas', () => {
  test('a agenda de exemplo aparece, abre só para leitura e não pede o link', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/calendario')
    const agenda = page.getByRole('list').filter({ hasText: 'Daily do time' }).first()
    await expect(agenda).toBeVisible()

    // Evento de agenda assinada abre os detalhes, não o editor.
    await page
      .getByRole('button', { name: /Daily do time/ })
      .first()
      .click()
    const details = page.getByRole('dialog')
    await expect(details.getByText('Agenda de exemplo · só leitura')).toBeVisible()
    await expect(details.getByRole('textbox')).toHaveCount(0)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Conectar agenda' }).click()
    const dialog = page.getByRole('dialog', { name: 'Agendas conectadas' })
    await expect(dialog.getByText('Exemplo do DevDesk')).toBeVisible()
    await expect(dialog.getByText(/uma agenda de exemplo já vem conectada/)).toBeVisible()
    await expect(dialog.getByRole('textbox')).toHaveCount(0)
  })

  test('o modo foco diz quanto tempo livre há até a próxima reunião', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/foco')
    await expect(
      page.getByText(/Em reunião até|Livre por|Só .* até a próxima|Sem mais reuniões hoje/),
    ).toBeVisible()
  })
})

test.describe('painel do time', () => {
  test('mostra quem espera review há mais tempo e a carga de cada pessoa', async ({ page }) => {
    await enterDemo(page)
    await page.keyboard.press('g')
    await page.keyboard.press('e')
    await expect(page).toHaveURL(/\/time/)
    const queue = page.getByRole('list', { name: 'PRs esperando review' })
    await expect(queue.getByRole('listitem').first()).toContainText(
      'Alerta de fila parada no worker de e-mails',
    )
    await expect(queue).not.toContainText('Tokens de cor')
    const load = page.getByRole('list', { name: 'Reviews pendentes por pessoa' })
    await expect(load.getByRole('listitem').first()).toContainText('rafael-lima')
  })
})

test.describe('idioma', () => {
  test('troca para inglês nas configurações e volta para português', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/configuracoes')
    await page.getByRole('radio', { name: 'English' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Needs you' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Today' }).first()).toBeVisible()

    await page.goto('/configuracoes')
    await page.getByRole('radio', { name: 'Português' }).click()
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
  })
})

test.describe('resumo da semana', () => {
  test('conta, lista e monta o texto para o 1:1; volta e avança de semana', async ({ page }) => {
    await enterDemo(page)
    await page.keyboard.press('g')
    await page.keyboard.press('w')
    await expect(page).toHaveURL(/\/semana/)
    await expect(page.getByRole('heading', { name: 'Semana' })).toBeVisible()
    await expect(page.getByText('O que você fez')).toBeVisible()
    const text = page.getByLabel('Texto do resumo')
    await expect(text).toHaveValue(/Semana de /)
    await expect(text).toHaveValue(/Travado agora/)

    await page.getByRole('button', { name: 'Semana anterior' }).click()
    await expect(page).toHaveURL(/semana=\d{4}-\d{2}-\d{2}/)
    await expect(page.getByRole('button', { name: 'Semana seguinte' })).toBeEnabled()
    await page.getByRole('button', { name: 'Esta semana' }).click()
    await expect(page.getByRole('button', { name: 'Semana seguinte' })).toBeDisabled()
  })
})

test.describe('busca', () => {
  test('"/" abre a busca e acha PRs, eventos e páginas', async ({ page }) => {
    await enterDemo(page)
    await page.keyboard.press('/')
    const input = page.getByPlaceholder(/Busque PRs/)
    await expect(input).toBeFocused()

    await input.fill('fuso')
    const palette = page.getByRole('dialog')
    await expect(palette.getByText('Pull requests')).toBeVisible()
    await expect(palette.getByText('Corrige o fuso horário no relatório de vendas')).toBeVisible()

    await input.fill('daily')
    await expect(palette.getByText('Agenda')).toBeVisible()
    await palette
      .getByRole('option', { name: /Daily do time/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/calendario\?mes=/)
  })
})

test.describe('GitHub da empresa', () => {
  test('painel vazio mostra o passo do token e colar conecta sozinho', async ({ page }) => {
    await enterDemo(page)
    // Imita uma conta comum, recém-entrada pelo GitHub, numa organização que bloqueia apps.
    // As respostas saem prontas daqui: o app busca de novo depois de conectar, e uma rota
    // que ainda fosse ao servidor podia terminar depois do teste.
    const me = await (await page.request.get('/api/me')).json()
    const dashboard = await (await page.request.get('/api/dashboard')).json()
    let connected = false
    await page.route('**/api/me', (route) =>
      route.fulfill({
        json: { ...me, user: { ...me.user, isDemo: false, login: 'colega', name: 'Colega' } },
      }),
    )
    await page.route('**/api/dashboard*', (route) =>
      route.fulfill({
        json: {
          ...dashboard,
          isSample: false,
          summary: {
            reviewRequested: 0,
            openPullRequests: 0,
            assignedIssues: 0,
            mergedThisWeek: 0,
          },
          attention: [],
          pullRequests: { reviewRequested: [], authored: [], merged: [] },
          issues: [],
        },
      }),
    )
    let saved: string | null = null
    await page.route('**/api/github/token', async (route) => {
      if (route.request().method() === 'PUT') {
        saved = route.request().postDataJSON().token
        connected = true
      }
      await route.fulfill({
        json: { connected, savedAt: connected ? new Date().toISOString() : null },
      })
    })

    await page.goto('/')
    const card = page.getByRole('complementary', { name: 'Conectar o GitHub da empresa' })
    await expect(card).toBeVisible()
    await expect(card.getByRole('link', { name: /Abra o GitHub/ })).toHaveAttribute(
      'href',
      /scopes=repo,read:org/,
    )

    await card.getByLabel('Token pessoal do GitHub').focus()
    await page.evaluate(() => {
      const data = new DataTransfer()
      data.setData('text/plain', 'ghp_tokenDeTesteColado123')
      document.activeElement?.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      )
    })
    await expect(page.getByText('GitHub conectado')).toBeVisible()
    await expect(card).toHaveCount(0)
    expect(saved).toBe('ghp_tokenDeTesteColado123')
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })
})

test.describe('configurações e privacidade', () => {
  test('a privacidade abre sem entrar e o login aponta para ela', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /Privacidade/ }).click()
    await expect(page).toHaveURL(/\/privacidade/)
    await expect(page.getByRole('heading', { name: 'Seus dados no DevDesk' })).toBeVisible()
  })

  test('desligar um aviso fica salvo', async ({ page }) => {
    await enterDemo(page)
    await page.keyboard.press('g')
    await page.keyboard.press('o')
    await expect(page).toHaveURL(/\/configuracoes/)
    // Na demonstração não há conta do GitHub: a seção só explica o token pessoal.
    await expect(page.getByText('Acesso ao GitHub')).toBeVisible()
    await expect(page.getByLabel('Token pessoal do GitHub')).toHaveCount(0)
    const ci = page.getByRole('checkbox', { name: /CI falhou/ })
    await expect(ci).toBeChecked()
    await ci.uncheck()
    await expect(ci).not.toBeChecked()
    await page.reload()
    await expect(page.getByRole('checkbox', { name: /CI falhou/ })).not.toBeChecked()
  })

  test('escolhe os repositórios do time à mão', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/configuracoes')
    await page.getByRole('radio', { name: 'Escolher' }).click()
    await page.getByLabel('Adicionar repositório').fill('acme/novo-servico')
    await page.getByRole('button', { name: 'Adicionar' }).click()
    const list = page.getByRole('list', { name: 'Repositórios' })
    await expect(list.getByRole('checkbox', { name: 'acme/novo-servico' })).toBeChecked()
    await page.getByRole('radio', { name: 'Automático' }).click()
    await expect(page.getByText(/O time sai dos repositórios/)).toBeVisible()
  })

  test('baixa os dados e apaga a conta com o login digitado', async ({ page }) => {
    await enterDemo(page)
    await page.goto('/configuracoes')
    const download = page.waitForEvent('download')
    await page.getByRole('link', { name: 'Baixar meus dados' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^devdesk-demo-.*\.json$/)
    // O conteúdo, não só o nome: um erro do servidor também seria baixado.
    const content = JSON.parse(readFileSync((await file.path())!, 'utf8'))
    expect(content).toMatchObject({ format: 'devdesk-export', version: 1 })

    await page.getByRole('button', { name: 'Apagar minha conta' }).click()
    const dialog = page.getByRole('dialog', { name: 'Apagar a conta' })
    const confirm = dialog.getByRole('button', { name: 'Apagar de vez' })
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('textbox').fill('demo')
    await confirm.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('? mostra os atalhos', async ({ page }) => {
    await enterDemo(page)
    await page.keyboard.press('Shift+?')
    const help = page.getByRole('dialog', { name: 'Atalhos de teclado' })
    await expect(help).toBeVisible()
    await expect(help.getByText('Configurações')).toBeVisible()
  })
})
