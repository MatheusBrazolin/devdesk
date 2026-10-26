import type { Clock } from '../../application/ports/security.js'
import type { TeamSource } from '../../application/ports/team-source.js'
import type { TeamPullRequest } from '../../domain/team.js'

const HOUR = 3_600_000

/** Time de exemplo do modo demonstração, com datas relativas ao agora. */
export class SampleTeamSource implements TeamSource {
  constructor(private readonly clock: Clock) {}

  async fetchOpenPullRequests() {
    const now = this.clock.now().getTime()
    const ago = (hours: number) => new Date(now - hours * HOUR)
    let seq = 0
    const pr = (
      data: Partial<TeamPullRequest> & Pick<TeamPullRequest, 'title' | 'repository' | 'number'>,
    ): TeamPullRequest => ({
      id: `SAMPLE_TEAM_${++seq}`,
      url: `https://github.com/${data.repository}/pull/${data.number}`,
      author: { login: 'ana-souza', avatarUrl: null },
      isDraft: false,
      createdAt: ago(20),
      updatedAt: ago(3),
      approved: false,
      reviews: 0,
      pendingReviewers: [],
      lines: 120,
      ...data,
    })

    const pullRequests = [
      pr({
        repository: 'acme/checkout-api',
        number: 482,
        title: 'Retentativa com backoff no webhook de pagamento',
        createdAt: ago(48),
        updatedAt: ago(26),
        reviews: 1,
        pendingReviewers: ['você', 'julia-martins'],
        lines: 245,
      }),
      pr({
        repository: 'acme/infra',
        number: 84,
        title: 'Alerta de fila parada no worker de e-mails',
        author: { login: 'demo', avatarUrl: null },
        createdAt: ago(12 * 24),
        updatedAt: ago(9 * 24),
        pendingReviewers: ['rafael-lima', 'time-infra'],
        lines: 60,
      }),
      pr({
        repository: 'acme/web-app',
        number: 1312,
        title: 'Extrai o formulário de endereço para um componente',
        author: { login: 'rafael-lima', avatarUrl: null },
        createdAt: ago(3),
        updatedAt: ago(3),
        pendingReviewers: ['você'],
        lines: 82,
      }),
      pr({
        repository: 'acme/web-app',
        number: 1309,
        title: 'Testes de contrato para o carrinho',
        author: { login: 'julia-martins', avatarUrl: null },
        createdAt: ago(4 * 24),
        updatedAt: ago(4 * 24),
        pendingReviewers: ['rafael-lima', 'ana-souza'],
        lines: 310,
      }),
      pr({
        repository: 'acme/checkout-api',
        number: 485,
        title: 'Log estruturado nas chamadas ao gateway',
        author: { login: 'rafael-lima', avatarUrl: null },
        createdAt: ago(30),
        updatedAt: ago(5),
        reviews: 2,
        approved: true,
        lines: 95,
      }),
      pr({
        repository: 'acme/design-system',
        number: 91,
        title: 'Componente de data com teclado',
        author: { login: 'julia-martins', avatarUrl: null },
        createdAt: ago(26),
        updatedAt: ago(8),
        pendingReviewers: ['rafael-lima'],
        lines: 180,
      }),
      pr({
        repository: 'acme/design-system',
        number: 88,
        title: 'Tokens de cor para o tema escuro',
        author: { login: 'julia-martins', avatarUrl: null },
        isDraft: true,
      }),
    ]
    const repositories = ['acme/web-app', 'acme/checkout-api', 'acme/infra', 'acme/design-system']
    return { pullRequests, repositories }
  }
}
