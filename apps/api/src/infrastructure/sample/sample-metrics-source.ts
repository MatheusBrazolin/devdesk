import type { Clock } from '../../application/ports/security.js'
import type { MetricsSource } from '../../application/ports/metrics-source.js'
import type { MergedPullRequestFacts, MetricsData } from '../../domain/metrics.js'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/**
 * Métricas de exemplo da demonstração: oito semanas com um ritmo crível
 * (algumas semanas cheias, uma de férias). Determinísticas, para a tela não
 * mudar a cada visita.
 */
export class SampleMetricsSource implements MetricsSource {
  constructor(private readonly clock: Clock) {}

  async fetchMetrics(): Promise<MetricsData> {
    const now = this.clock.now().getTime()
    // PRs por semana, da mais antiga à atual; a sexta é a de férias.
    const perWeek = [3, 5, 4, 6, 4, 0, 5, 2]
    const merged: MergedPullRequestFacts[] = []
    const reviewsGiven: Date[] = []
    perWeek.forEach((count, week) => {
      const weekEnd = now - (perWeek.length - 1 - week) * 7 * DAY
      for (let i = 0; i < count; i++) {
        const mergedAt = weekEnd - (i * 13 + 5) * HOUR
        const hoursOpen = 8 + ((week * 7 + i * 11) % 60)
        merged.push({
          createdAt: new Date(mergedAt - hoursOpen * HOUR),
          mergedAt: new Date(mergedAt),
          firstReviewAt: new Date(mergedAt - hoursOpen * HOUR + (2 + ((i * 5) % 9)) * HOUR),
          lines: 60 + ((week * 37 + i * 83) % 420),
        })
      }
      const reviews = week === 5 ? 1 : 4 + ((week * 3) % 5)
      for (let i = 0; i < reviews; i++) reviewsGiven.push(new Date(weekEnd - (i * 17 + 3) * HOUR))
    })
    return { merged, reviewsGiven }
  }
}
