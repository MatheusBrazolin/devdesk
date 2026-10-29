import { Fragment, type ReactNode, createElement } from 'react'

/**
 * Idiomas do app. O texto em português é a própria chave: `t('Salvar')`
 * devolve "Salvar" em português e "Save" em inglês. Tradução que falta cai
 * no português, nunca num buraco na tela. As mensagens de erro da API, que
 * chegam em português, passam pelo mesmo dicionário.
 *
 * Trocar de idioma recarrega a página: datas, números e textos guardados em
 * constantes de módulo mudam juntos, sem estado escondido.
 */

export type Language = 'pt-BR' | 'en'

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'pt-BR', label: 'Português' },
  { value: 'en', label: 'English' },
]

const STORAGE_KEY = 'devdesk:idioma'

function detect(): Language {
  // Os testes conferem os textos em português, qualquer que seja a máquina.
  if (import.meta.env.MODE === 'test') return 'pt-BR'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'pt-BR' || saved === 'en') return saved
  } catch {
    // Sem armazenamento: segue o navegador.
  }
  const browser = typeof navigator === 'undefined' ? 'pt-BR' : navigator.language
  return browser.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

/** O idioma desta carga da página. */
export const LANGUAGE: Language = detect()

/** Para `Intl.DateTimeFormat`, `toLocaleString` e afins. */
export const LOCALE = LANGUAGE === 'en' ? 'en-US' : 'pt-BR'

/** Hora como cada idioma escreve: "09:30" em português, "9:30 AM" em inglês. */
export const HOUR_STYLE = LANGUAGE === 'en' ? 'numeric' : '2-digit'

/**
 * Dia da semana e dia do mês na ordem de cada idioma: "sex., 30" e "Fri 30".
 * Pedido junto, o Intl em inglês escreve "30 Fri".
 */
export function weekdayDayFormat(weekday: 'short' | 'long') {
  const both = new Intl.DateTimeFormat(LOCALE, { weekday, day: 'numeric' })
  const name = new Intl.DateTimeFormat(LOCALE, { weekday })
  return {
    format: (date: Date) =>
      LANGUAGE === 'en' ? `${name.format(date)} ${date.getDate()}` : both.format(date),
  }
}

/** Cada pasta traz o seu `en.ts`: dicionário em pedaços, sem um arquivo gigante. */
const modules = import.meta.glob<{ default: Record<string, string> }>('/src/**/en.ts', {
  eager: true,
})
const EN: Record<string, string> = Object.assign(
  {},
  ...Object.values(modules).map((module) => module.default),
)

/**
 * Traduz um texto escrito em português. `{nome}` no texto é trocado pelo
 * valor de `vars`, nos dois idiomas.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const translated = LANGUAGE === 'en' ? (EN[text] ?? text) : text
  if (!vars) return translated
  return translated.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/**
 * Como `t`, mas os `{marcadores}` podem ser elementos (um link, um código):
 * a frase inteira vira uma chave só, em vez de pedaços soltos como "e" ou "em".
 */
export function tx(text: string, parts: Record<string, ReactNode>): ReactNode[] {
  return t(text)
    .split(/\{(\w+)\}/)
    .map((piece, index) =>
      createElement(Fragment, { key: index }, index % 2 === 1 ? (parts[piece] ?? piece) : piece),
    )
}

/** Escolhe o singular ou o plural já traduzido. */
export const plural = (count: number, one: string, many: string) =>
  t(count === 1 ? one : many, { n: count })

/** Marca, para a próxima carga, que a página deve entrar esmaecendo (lida no theme-init.js). */
const SWAP_FLAG = 'devdesk:troca-idioma'
/** Quanto a tela leva para sumir antes de recarregar (bate com o CSS). */
const LEAVE_MS = 220

/**
 * Troca o idioma. A página recarrega para datas e textos mudarem juntos, mas
 * sem piscar: a tela esmaece, recarrega e volta esmaecendo. Com movimento
 * reduzido, a troca é direta.
 */
export function setLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Sem armazenamento: vale só até recarregar.
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return window.location.reload()
  try {
    sessionStorage.setItem(SWAP_FLAG, '1')
  } catch {
    // Sem armazenamento: volta sem esmaecer, só isso.
  }
  document.documentElement.classList.add('lang-leaving')
  window.setTimeout(() => window.location.reload(), LEAVE_MS)
}

/** Para testes: o dicionário inglês inteiro. */
export const englishDictionary = (): Readonly<Record<string, string>> => EN
