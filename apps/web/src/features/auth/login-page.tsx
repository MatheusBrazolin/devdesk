import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { GitHubIcon } from '@/components/ui/github-icon'
import { Logo } from '@/components/ui/logo'
import { ProductPreview } from './product-preview'
import { GITHUB_LOGIN_URL, configQuery, useDemoLogin, usePersonalLogin } from './queries'

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
  const personal = usePersonalLogin()
  const errorMessage = erro ? (ERROR_MESSAGES[erro] ?? 'Não foi possível entrar.') : null
  const githubEnabled = config.data?.githubLoginEnabled ?? false
  const personalLogin = config.data?.personalLogin ?? null
  const personalRejected = config.data?.personalTokenEnabled === true && personalLogin === null
  // Sem nenhum jeito de entrar com o GitHub (a demonstração pública), o botão
  // desativado só confunde: some, e a demonstração vira a entrada principal.
  const githubAvailable = githubEnabled || personalLogin !== null

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

          {personalRejected && (
            <p
              role="alert"
              className="mt-6 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-[13px] text-danger"
            >
              O GitHub recusou o token pessoal (revogado ou vencido). Gere outro e rode{' '}
              <code className="font-mono">npm run setup:github</code>.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-2">
            {personalLogin && (
              <Button size="lg" disabled={personal.isPending} onClick={() => personal.mutate()}>
                {personal.isPending ? <Loader2 className="animate-spin" /> : <GitHubIcon />}
                Entrar como {personalLogin}
              </Button>
            )}

            {githubEnabled && (
              <Button
                size="lg"
                variant={personalLogin ? 'outline' : 'primary'}
                onClick={() => window.location.assign(GITHUB_LOGIN_URL)}
              >
                <GitHubIcon />
                Continuar com GitHub
              </Button>
            )}

            {config.data?.demoEnabled && (
              <Button
                size="lg"
                variant={githubAvailable ? 'outline' : 'primary'}
                disabled={demo.isPending}
                onClick={() => demo.mutate()}
              >
                {demo.isPending && <Loader2 className="animate-spin" />}
                Ver a demonstração
                {!demo.isPending && <ArrowRight className="text-fg-subtle" />}
              </Button>
            )}
          </div>

          {personal.isError && (
            <p role="alert" className="mt-3 text-[13px] text-danger">
              {personal.error.message}
            </p>
          )}
          {demo.isError && (
            <p role="alert" className="mt-3 text-[13px] text-danger">
              {demo.error.message}
            </p>
          )}

          <p className="mt-6 text-[12px] leading-relaxed text-fg-subtle">
            {personalLogin ? (
              'Modo pessoal: esta instalação usa o seu token do GitHub e só aceita acesso desta máquina.'
            ) : config.isSuccess && !githubEnabled ? (
              import.meta.env.DEV ? (
                // Só quem está desenvolvendo vê como ligar; o visitante não.
                <>
                  Login com GitHub desligado: defina{' '}
                  <code className="font-mono text-fg-muted">GITHUB_CLIENT_ID</code> e{' '}
                  <code className="font-mono text-fg-muted">GITHUB_CLIENT_SECRET</code> no{' '}
                  <code className="font-mono text-fg-muted">.env</code>.
                </>
              ) : (
                'Esta é uma demonstração pública, com dados de exemplo: nada aqui está ligado a uma conta real. Para ver o seu próprio GitHub, rode o DevDesk na sua máquina.'
              )
            ) : (
              'O GitHub vai pedir acesso aos seus repositórios, porque OAuth Apps não têm uma permissão só de leitura. O DevDesk apenas lê: não comenta, não aprova e não faz merge.'
            )}
          </p>
          <Link
            to="/privacidade"
            className="mt-3 inline-block text-[12px] text-fg-subtle underline-offset-2 hover:text-fg-muted hover:underline"
          >
            Privacidade: o que fica guardado e como apagar
          </Link>
        </motion.div>
      </section>

      <aside className="hidden border-l border-border bg-elevated lg:flex lg:items-center lg:justify-center lg:p-12">
        <ProductPreview />
      </aside>
    </main>
  )
}
