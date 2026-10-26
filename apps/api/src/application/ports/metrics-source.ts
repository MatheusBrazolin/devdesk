import type { MetricsData } from '../../domain/metrics.js'

/** Os fatos das métricas de entrega de uma pessoa num período. */
export interface MetricsSource {
  fetchMetrics(accessToken: string, login: string, from: Date, to: Date): Promise<MetricsData>
}
