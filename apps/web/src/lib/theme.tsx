import { createContext, type ReactNode, useContext, useEffect } from 'react'

/**
 * O DevDesk tem um visual só, o Quadro, escuro. O provedor fica para quem
 * precisa saber o tema (o Toaster, por exemplo) e garante a classe `dark`,
 * que os componentes com variante escura usam.
 */
interface ThemeContextValue {
  resolved: 'dark'
}

const ThemeContext = createContext<ThemeContextValue>({ resolved: 'dark' })

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])
  return <ThemeContext value={{ resolved: 'dark' }}>{children}</ThemeContext>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
