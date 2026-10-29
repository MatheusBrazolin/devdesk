/**
 * Devolve o foco a quem abriu o diálogo. O Radix guarda o elemento focado
 * quando o diálogo monta, mas os nossos formulários usam autoFocus: o campo
 * de dentro já está focado nessa hora, some ao fechar, e o foco caía no
 * <body>. Aqui se lembra o último elemento focado fora de qualquer diálogo.
 */

const DIALOG = '[role="dialog"], [role="alertdialog"]'

let lastOutside: HTMLElement | null = null

if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target
      if (target instanceof HTMLElement && !target.closest(DIALOG)) lastOutside = target
    },
    true,
  )
  document.addEventListener(
    'focusout',
    (event) => {
      // Foco saiu para o nada (clique em área vazia): não há a quem devolver.
      const target = event.target
      if (!event.relatedTarget && target instanceof HTMLElement && !target.closest(DIALOG)) {
        lastOutside = null
      }
    },
    true,
  )
}

/** Para o onCloseAutoFocus do Dialog.Content. */
export function returnFocus(event: Event): void {
  if (!lastOutside?.isConnected) return
  event.preventDefault()
  lastOutside.focus({ preventScroll: true })
}
