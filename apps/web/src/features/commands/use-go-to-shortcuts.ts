import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { NAV_ITEMS } from '@/lib/navigation'

const SEQUENCE_TIMEOUT_MS = 1200

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** "g" seguido da tecla do item leva até ele, como no GitHub e no Linear. */
export function useGoToShortcuts(): void {
  const navigate = useNavigate()

  useEffect(() => {
    let armedAt = 0

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      // Com um diálogo aberto, navegar descartaria o que está nele.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      const key = event.key.toLowerCase()

      if (armedAt && Date.now() - armedAt < SEQUENCE_TIMEOUT_MS) {
        armedAt = 0
        const item = NAV_ITEMS.find((nav) => nav.shortcut === key)
        if (item) {
          event.preventDefault()
          void navigate({ to: item.to })
        }
        return
      }
      armedAt = key === 'g' ? Date.now() : 0
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])
}
