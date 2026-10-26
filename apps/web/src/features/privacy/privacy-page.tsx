import { Link } from '@tanstack/react-router'
import { ArrowLeft, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/ui/logo'

const REPOSITORY = 'https://github.com/MatheusBrazolin/devdesk'

/**
 * O que o DevDesk guarda, como guarda, por quanto tempo e como levar ou apagar.
 * Página pública: dá para ler antes de entrar.
 */
export function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo />
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" /> Voltar ao DevDesk
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-[12px] font-medium text-fg-subtle">
            <Lock className="size-3.5" /> Privacidade
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Seus dados no DevDesk</h1>
          <p className="text-[14px] leading-relaxed text-fg-muted">
            O DevDesk é um painel pessoal: mostra o seu trabalho no GitHub ao lado das suas notas e
            da sua agenda. Esta página diz o que fica guardado, como e por quanto tempo, e como
            levar ou apagar tudo. Vale a Lei Geral de Proteção de Dados (LGPD).
          </p>
        </div>

        <Section title="O que fica guardado">
          <List
            items={[
              <>
                <b>Perfil do GitHub:</b> login, nome e foto, para mostrar quem está conectado.
              </>,
              <>
                <b>Token de acesso do GitHub:</b> cifrado (AES-256-GCM). Serve só para ler; o
                DevDesk nunca comenta, aprova, edita nem faz merge, e uma trava no código recusa
                qualquer escrita.
              </>,
              <>
                <b>O que você escreve:</b> notas, eventos, lembretes e configurações.
              </>,
              <>
                <b>Agendas conectadas:</b> o nome que você deu e o endereço secreto do .ics,
                cifrado. O endereço não volta para o navegador depois de salvo.
              </>,
              <>
                <b>Avisos com o app fechado:</b> o endereço de entrega que o navegador cria, e quais
                avisos já foram mandados, para não repetir.
              </>,
              <>
                <b>Último retrato do painel:</b> uma cópia dos seus PRs e issues, para a tela abrir
                na hora. É substituída a cada atualização.
              </>,
            ]}
          />
        </Section>

        <Section title="O que não fica guardado">
          <List
            items={[
              'Código, comentários ou conteúdo dos repositórios: só o que aparece no painel.',
              'Senhas: o login é feito pelo próprio GitHub.',
              'Rastreamento, anúncios ou análise de uso de terceiros: não há nenhum.',
            ]}
          />
        </Section>

        <Section title="Por quanto tempo">
          <List
            items={[
              'Sessão: 30 dias, ou até você sair.',
              'Modo demonstração: tudo o que a visita criou é apagado depois de 24 horas.',
              'Conta: até você apagar. Ao apagar, tudo sai na hora, sem cópia guardada.',
            ]}
          />
        </Section>

        <Section title="Com quem os dados passam">
          <List
            items={[
              'GitHub: de onde vêm os PRs, issues e reviews.',
              'Google, Microsoft (Outlook) ou Apple (iCloud): só se você conectar uma agenda, para baixar o .ics.',
              'Serviço de push do seu navegador (Google, Mozilla, Apple ou Microsoft): só o aviso, se você ligar as notificações.',
              'Hospedagem: Render (servidor) e Neon (banco de dados), nos Estados Unidos.',
            ]}
          />
        </Section>

        <Section title="Seus direitos">
          <List
            items={[
              <>
                <b>Levar seus dados:</b> em Configurações → Seus dados, "Baixar meus dados" gera um
                JSON com notas, eventos, agendas e configurações.
              </>,
              <>
                <b>Apagar a conta:</b> em Configurações → Seus dados. Leva junto sessões, token,
                notas, eventos, agendas, avisos e configurações.
              </>,
              <>
                <b>Tirar o acesso ao GitHub:</b> em{' '}
                <ExternalLink href="https://github.com/settings/applications">
                  github.com/settings/applications
                </ExternalLink>
                , revogue o DevDesk.
              </>,
              <>
                <b>Dúvidas ou pedidos:</b> abra uma issue em{' '}
                <ExternalLink href={`${REPOSITORY}/issues`}>
                  github.com/MatheusBrazolin/devdesk
                </ExternalLink>
                . O código é aberto: dá para conferir tudo o que está escrito aqui.
              </>,
            ]}
          />
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-fg-muted marker:text-fg-subtle [&_b]:font-medium [&_b]:text-fg">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-fg underline underline-offset-2"
    >
      {children}
    </a>
  )
}
