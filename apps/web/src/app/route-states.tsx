import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Logo } from '@/components/ui/logo'
import { t } from '@/lib/i18n'

function Frame({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col px-6 py-6 sm:px-10">
      <Logo />
      <div className="mx-auto my-auto w-full max-w-sm py-12">
        <p className="font-mono text-[12px] text-fg-subtle">{code}</p>
        <h1 className="mt-2 text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </main>
  )
}

/** Falha ao carregar uma rota (ex.: a API fora do ar antes do login). */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <Frame code={t('erro')} title={t('Não foi possível abrir esta página')}>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {error instanceof Error ? error.message : t('Erro desconhecido.')}
      </p>
      <Button variant="outline" className="mt-6" onClick={() => void router.invalidate()}>
        <RefreshCw /> {t('Tentar de novo')}
      </Button>
    </Frame>
  )
}

export function NotFound() {
  return (
    <Frame code="404" title={t('Página não encontrada')}>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {t('O endereço pode estar errado ou a página mudou de lugar.')}
      </p>
      <Link to="/" className={buttonVariants({ variant: 'outline', className: 'mt-6' })}>
        {t('Voltar para Hoje')}
      </Link>
    </Frame>
  )
}
