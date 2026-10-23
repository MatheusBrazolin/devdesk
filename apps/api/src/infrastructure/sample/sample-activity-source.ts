import type { ActivitySource } from '../../application/ports/activity-source.js'
import type { Activity } from '../../domain/activity.js'

const ref = (repository: string, kind: 'pull' | 'issues', number: number, title: string) => ({
  title,
  url: `https://github.com/${repository}/${kind}/${number}`,
  repository,
  number,
})

/** Atividade de exemplo do modo demonstração, coerente com os PRs da demo. */
export class SampleActivitySource implements ActivitySource {
  async fetchActivity(): Promise<Activity> {
    return {
      merged: [ref('acme/infra', 'pull', 77, 'Atualiza o Postgres do staging para a 17')],
      opened: [ref('acme/infra', 'pull', 81, 'Alarme de latência p95 no gateway')],
      reviewed: [
        {
          ...ref('acme/web-app', 'pull', 1268, 'Skeleton no carregamento da lista de clientes'),
          verdict: 'approved',
        },
        {
          ...ref('acme/checkout-api', 'pull', 474, 'Cache dos fretes por CEP'),
          verdict: 'changes_requested',
        },
      ],
      closedIssues: [ref('acme/web-app', 'issues', 1259, 'Botão de exportar some no Safari')],
    }
  }
}
