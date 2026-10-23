import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { GitHubIcon } from '@/components/ui/github-icon'
import { Logo } from '@/components/ui/logo'
import { ProductPreview } from './product-preview'
import { GITHUB_LOGIN_URL, configQuery, useDemoLogin } from './queries'

const route = getRouteApi('/login')

const ERROR_MESSAGES: Record<string, string> = {
  cancelado: 'O login foi cancelado no GitHub.',
  'estado-invalido': 'A tentativa de login expirou. Tente de novo.',
  github: 'O GitHub não confirmou o login. Tente de novo em instantes.',
}

export function LoginPage() {
  const { erro } = route.useSearch()
  const config = useQuery(configQuery)
  const demo = useDemoLogin()
  const errorMessage = erro ? (ERROR_MESSAGES[erro] ?? 'Não foi possível entrar.') : null
  const githubEnabled = config.data?.githubLoginEnabled ?? false

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="flex flex-col px-6 py-6 sm:px-10">
        <Logo />

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mx-auto my-auto w-full max-w-sm py-12"
        >
          <h1 className="text-2xl font-semibold">Entrar no DevDesk</h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Reviews pendentes, seus pull requests e issues, junto com suas notas e sua agenda.
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-6 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-[13px] text-danger"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2">
            <Button
              size="lg"
              disabled={!githubEnabled}
              onClick={() => window.location.assign(GITHUB_LOGIN_URL)}
            >
              <GitHubIcon />
              Continuar com GitHub
            </Button>

            {config.data?.demoEnabled && (
              <Button
                size="lg"
                variant="outline"
                disabled={demo.isPending}
                onClick={() => demo.mutate()}
              >
                {demo.isPending && <Loader2 className="animate-spin" />}
                Ver a demonstração
                {!demo.isPending && <ArrowRight className="text-fg-subtle" />}
              </Button>
            )}
          </div>

          {demo.isError && (
            <p role="alert" className="mt-3 text-[13px] text-danger">
              {demo.error.message}
            </p>
          )}

          <p className="mt-6 text-[12px] leading-relaxed text-fg-subtle">
            {config.isSuccess && !githubEnabled ? (
              <>
                Login com GitHub desligado: defina{' '}
                <code className="font-mono text-fg-muted">GITHUB_CLIENT_ID</code> e{' '}
                <code className="font-mono text-fg-muted">GITHUB_CLIENT_SECRET</code> no{' '}
                <code className="font-mono text-fg-muted">.env</code>.
              </>
            ) : (
              'Pedimos acesso de leitura aos seus repositórios para listar PRs e issues. Nada é publicado em seu nome.'
            )}
          </p>
        </motion.div>
      </section>

      <aside className="hidden border-l border-border bg-elevated lg:flex lg:items-center lg:justify-center lg:p-12">
        <ProductPreview />
      </aside>
    </main>
  )
}
