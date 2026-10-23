import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createTestContext } from '../../test/helpers.js'
import { buildApp } from './app.js'

function fakeDist() {
  const root = mkdtempSync(join(tmpdir(), 'devdesk-web-'))
  mkdirSync(join(root, 'assets'))
  writeFileSync(join(root, 'index.html'), '<!doctype html><div id="root"></div>')
  writeFileSync(join(root, 'assets', 'app-abc123.js'), 'console.log(1)')
  return root
}

const page = { accept: 'text/html' }

describe('front servido pela API (produção)', () => {
  it('rotas do app devolvem o index.html, sem cache', async () => {
    const app = await buildApp(createTestContext().deps, { webDistDir: fakeDist() })
    for (const url of ['/', '/notas', '/calendario?mes=2026-10']) {
      const res = await app.inject({ url, headers: page })
      expect(res.statusCode, url).toBe(200)
      expect(res.body).toContain('id="root"')
      expect(res.headers['cache-control']).toBe('no-cache')
    }
  })

  it('arquivos com hash ficam em cache por um ano', async () => {
    const app = await buildApp(createTestContext().deps, { webDistDir: fakeDist() })
    const res = await app.inject({ url: '/assets/app-abc123.js' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['cache-control']).toContain('immutable')
  })

  it('a API continua respondendo JSON, inclusive o 404', async () => {
    const app = await buildApp(createTestContext().deps, { webDistDir: fakeDist() })
    const res = await app.inject({ url: '/api/nao-existe', headers: page })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })

  it('a página proíbe script inline e de outras origens', async () => {
    const app = await buildApp(createTestContext().deps, { webDistDir: fakeDist() })
    const csp = String(
      (await app.inject({ url: '/', headers: page })).headers['content-security-policy'],
    )
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('sem a pasta do front, tudo fora de /api é 404 em JSON', async () => {
    const app = await buildApp(createTestContext().deps)
    const res = await app.inject({ url: '/notas', headers: page })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })
})
