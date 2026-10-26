import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'devdesk:theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // Sem acesso ao storage (aba privada, bloqueio): segue o sistema.
  }
  return 'system'
}

interface ThemeContextValue {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Quanto dura a fusão de um tema no outro (precisa bater com o CSS). */
const FALLBACK_MS = 450

/**
 * Troca o tema sem acender a tela de uma vez. Com View Transitions, o
 * navegador fotografa o tema antigo e funde no novo; sem ela, as cores
 * mudam por transição de CSS. Com movimento reduzido, a troca é direta.
 */
function applyTheme(dark: boolean, animate: boolean) {
  // A barra da janela do app instalado acompanha o tema escolhido no app,
  // não só o do sistema.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]'))
    meta.setAttribute('content', dark ? '#121211' : '#fafaf9')
  const root = document.documentElement
  const swap = () => root.classList.toggle('dark', dark)
  if (root.classList.contains('dark') === dark) return
  if (!animate || reducedMotion()) return swap()

  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(swap)
    return
  }
  root.classList.add('theme-fading')
  swap()
  window.setTimeout(() => root.classList.remove('theme-fading'), FALLBACK_MS)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readPreference)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  useEffect(() => {
    const query = media()
    const onChange = () => setSystemDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  // A primeira aplicação é direta (o tema já veio certo do theme-init.js);
  // as seguintes, escolhidas pela pessoa ou pelo sistema, são suaves.
  const applied = useRef(false)
  useEffect(() => {
    applyTheme(resolved === 'dark', applied.current)
    applied.current = true
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Preferência vale só nesta aba.
    }
  }, [])

  const toggle = useCallback(
    () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
    [resolved, setPreference],
  )

  return (
    <ThemeContext value={{ preference, resolved, setPreference, toggle }}>{children}</ThemeContext>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme precisa estar dentro de <ThemeProvider>')
  return context
}
