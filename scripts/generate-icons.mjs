// Gera os ícones PNG do app instalável a partir do logo (o mesmo do favicon).
// Uso: node scripts/generate-icons.mjs   (precisa do Chromium do Playwright)
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const OUT = 'apps/web/public/icons'
const BG = '#18181b'
const FG = '#fafaf9'
const ACCENT = '#e8a13a'

/** O "D" com o ponto, desenhado num quadro de 32×32 (como no favicon). */
const mark = `<path d="M10 9h5.5a7 7 0 0 1 0 14H10z" fill="none" stroke="${FG}" stroke-width="2.6" stroke-linejoin="round"/>
  <rect x="20.5" y="9" width="2.6" height="2.6" fill="${ACCENT}"/>`

const svgs = {
  // Ícone comum: cantos arredondados, como no favicon.
  rounded: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${BG}"/>${mark}</svg>`,
  // Maskable e Apple: fundo até a borda (o sistema recorta) e o "D" dentro da zona segura.
  fullBleed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${BG}"/><g transform="translate(16 16) scale(0.72) translate(-16 -16)">${mark}</g></svg>`,
}

const icons = [
  ['icon-192.png', 192, 'rounded'],
  ['icon-512.png', 512, 'rounded'],
  ['maskable-512.png', 512, 'fullBleed'],
  ['apple-touch-icon.png', 180, 'fullBleed'],
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, size, kind] of icons) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svgs[kind]}`,
  )
  await page.screenshot({ path: `${OUT}/${name}`, omitBackground: true })
  console.log('gerado', `${OUT}/${name}`)
}
await browser.close()
