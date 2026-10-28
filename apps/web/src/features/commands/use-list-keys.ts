import { useEffect } from 'react'

const SEQUENCE_TIMEOUT_MS = 1200

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** O link principal de cada linha marcada com data-list-item, na ordem da página. */
const rowLinks = () =>
  Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-list-item] a[data-list-link]'))

/**
 * "j" e "k" andam pelas linhas da lista, "o" abre a linha no GitHub, como no
 * Gmail e no GitHub. O foco vai para o link da linha, então Enter também abre
 * e o leitor de tela lê o título.
 */
export function useListKeys(): void {
  useEffect(() => {
    // A tecla logo depois de "g" é de useGoToShortcuts ("g o" leva às Configurações).
    let afterG = 0

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      const key = event.key.toLowerCase()
      const sequence = afterG && Date.now() - afterG < SEQUENCE_TIMEOUT_MS
      afterG = key === 'g' ? Date.now() : 0
      if (sequence) return
      if (key !== 'j' && key !== 'k' && key !== 'o') return

      const links = rowLinks()
      if (links.length === 0) return
      const current = links.indexOf(document.activeElement as HTMLAnchorElement)

      event.preventDefault()
      if (key === 'o') {
        links[current]?.click()
        return
      }
      const next =
        current === -1
          ? key === 'j'
            ? 0
            : links.length - 1
          : Math.min(Math.max(current + (key === 'j' ? 1 : -1), 0), links.length - 1)
      links[next]?.focus()
      links[next]?.scrollIntoView({ block: 'nearest' })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
