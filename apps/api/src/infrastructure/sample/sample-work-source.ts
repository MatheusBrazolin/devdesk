import type { Clock } from '../../application/ports/security.js'
import type { WorkSource } from '../../application/ports/work-source.js'
import type { Actor, Issue, PullRequest, WorkSnapshot } from '../../domain/work.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const people: Record<string, Actor> = {
  me: { login: 'demo', avatarUrl: null },
  ana: { login: 'ana-souza', avatarUrl: null },
  rafael: { login: 'rafael-lima', avatarUrl: null },
  julia: { login: 'julia-martins', avatarUrl: null },
}

/**
 * Dados de exemplo do modo demonstração. As datas são relativas ao agora,
 * para o painel parecer vivo; o snapshot sai marcado como isSample.
 */
export class SampleWorkSource implements WorkSource {
  constructor(private readonly clock: Clock) {}

  async fetchSnapshot(): Promise<WorkSnapshot> {
    const now = this.clock.now().getTime()
    const ago = (ms: number) => new Date(now - ms)

    let seq = 0
    const pr = (
      data: Partial<PullRequest> & Pick<PullRequest, 'title' | 'repository' | 'number'>,
    ): PullRequest => ({
      id: `SAMPLE_PR_${++seq}`,
      url: `https://github.com/${data.repository}/pull/${data.number}`,
      author: people.me!,
      isDraft: false,
      createdAt: ago(3 * DAY),
      updatedAt: ago(5 * HOUR),
      mergedAt: null,
      ciStatus: 'success',
      reviewDecision: 'review_required',
      mergeable: 'mergeable',
      approvals: 0,
      comments: 0,
      ...data,
    })

    const issue = (
      data: Partial<Issue> & Pick<Issue, 'title' | 'repository' | 'number'>,
    ): Issue => ({
      id: `SAMPLE_ISSUE_${++seq}`,
      url: `https://github.com/${data.repository}/issues/${data.number}`,
      author: people.ana!,
      createdAt: ago(4 * DAY),
      updatedAt: ago(1 * DAY),
      labels: [],
      comments: 0,
      ...data,
    })

    const reviewRequested = [
      pr({
        repository: 'acme/checkout-api',
        number: 482,
        title: 'Retentativa com backoff no webhook de pagamento',
        author: people.ana!,
        createdAt: ago(2 * DAY),
        updatedAt: ago(26 * HOUR),
        comments: 4,
      }),
      pr({
        repository: 'acme/web-app',
        number: 1312,
        title: 'Extrai o formulário de endereço para um componente',
        author: people.rafael!,
        updatedAt: ago(3 * HOUR),
        comments: 1,
      }),
      pr({
        repository: 'acme/design-system',
        number: 88,
        title: 'Tokens de cor para o tema escuro',
        author: people.julia!,
        isDraft: true,
        ciStatus: 'pending',
      }),
    ]

    const authored = [
      pr({
        repository: 'acme/web-app',
        number: 1290,
        title: 'Migra a tabela de pedidos para paginação por cursor',
        reviewDecision: 'approved',
        approvals: 2,
        comments: 6,
        updatedAt: ago(2 * HOUR),
      }),
      pr({
        repository: 'acme/checkout-api',
        number: 476,
        title: 'Remove o endpoint legado de cupons',
        ciStatus: 'failure',
        updatedAt: ago(40 * 60 * 1000),
        comments: 2,
      }),
      pr({
        repository: 'acme/web-app',
        number: 1275,
        title: 'Corrige o fuso horário no relatório de vendas',
        reviewDecision: 'changes_requested',
        comments: 9,
        updatedAt: ago(20 * HOUR),
      }),
      pr({
        repository: 'acme/infra',
        number: 81,
        title: 'Alarme de latência p95 no gateway',
        ciStatus: 'pending',
        updatedAt: ago(15 * 60 * 1000),
      }),
      pr({
        repository: 'acme/web-app',
        number: 1301,
        title: 'Atualiza o React Router para a v7',
        mergeable: 'conflicting',
        approvals: 1,
        updatedAt: ago(2 * DAY),
      }),
    ]

    const merged = [
      pr({
        repository: 'acme/infra',
        number: 77,
        title: 'Atualiza o Postgres do staging para a 17',
        reviewDecision: 'approved',
        approvals: 1,
        mergedAt: ago(22 * HOUR),
        updatedAt: ago(22 * HOUR),
      }),
      pr({
        repository: 'acme/web-app',
        number: 1268,
        title: 'Skeleton no carregamento da lista de clientes',
        reviewDecision: 'approved',
        approvals: 2,
        mergedAt: ago(3 * DAY),
        updatedAt: ago(3 * DAY),
      }),
      pr({
        repository: 'acme/checkout-api',
        number: 470,
        title: 'Idempotência nas confirmações de pedido',
        reviewDecision: 'approved',
        approvals: 2,
        mergedAt: ago(5 * DAY),
        updatedAt: ago(5 * DAY),
      }),
    ]

    const issues = [
      issue({
        repository: 'acme/web-app',
        number: 1305,
        title: 'Filtro de data some ao voltar da página de detalhes',
        labels: [{ name: 'bug', color: 'd73a4a' }],
        comments: 3,
        updatedAt: ago(6 * HOUR),
      }),
      issue({
        repository: 'acme/checkout-api',
        number: 479,
        title: 'Documentar os códigos de erro do PIX',
        labels: [{ name: 'documentação', color: '0075ca' }],
        author: people.rafael!,
      }),
      issue({
        repository: 'acme/web-app',
        number: 1288,
        title: 'Exportar pedidos em CSV',
        labels: [
          { name: 'feature', color: 'a2eeef' },
          { name: 'prioridade: média', color: 'fbca04' },
        ],
        comments: 5,
        updatedAt: ago(2 * DAY),
      }),
      issue({
        repository: 'acme/infra',
        number: 74,
        title: 'Rotacionar as chaves do bucket de backups',
        labels: [{ name: 'segurança', color: 'b60205' }],
        author: people.julia!,
        updatedAt: ago(4 * DAY),
      }),
    ]

    return {
      fetchedAt: new Date(now),
      isSample: true,
      reviewRequested,
      authored,
      merged,
      issues,
      totals: {
        reviewRequested: reviewRequested.length,
        authored: authored.length,
        merged: merged.length,
        issues: issues.length,
      },
    }
  }
}
