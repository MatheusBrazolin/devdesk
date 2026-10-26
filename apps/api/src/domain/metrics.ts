/**
 * Métricas de entrega de uma pessoa, semana a semana: quanto mergeou, quanto
 * revisou para os outros, quanto os PRs levam até o merge e até a primeira
 * review. Função pura: recebe os fatos, devolve os números.
 */

export interface MergedPullRequestFacts {
  createdAt: Date
  mergedAt: Date
  /** Primeira review de outra pessoa; nula se mergeou sem review. */
  firstReviewAt: Date | null
  /** Linhas mudadas (somadas + removidas); nulo se o GitHub não informou. */
  lines: number | null
}

export interface MetricsData {
  merged: MergedPullRequestFacts[]
  /** Quando cada review que a pessoa fez para os outros foi enviada. */
  reviewsGiven: Date[]
}

export interface WeekMetrics {
  /** Segunda-feira da semana (UTC), "2026-10-19". */
  weekStart: string
  merged: number
  reviews: number
  /** Mediana de horas da abertura ao merge, dos PRs mergeados na semana. */
  medianHoursToMerge: number | null
}

export interface Metrics {
  weeks: WeekMetrics[]
  totals: {
    merged: number
    reviews: number
    medianHoursToMerge: number | null
    medianHoursToFirstReview: number | null
    medianLines: number | null
  }
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const value = sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
  return Math.round(value * 10) / 10
}

/** Segunda-feira 00:00 UTC da semana do instante. */
export function weekStartOf(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const sinceMonday = (day.getUTCDay() + 6) % 7
  return new Date(day.getTime() - sinceMonday * DAY)
}

const key = (date: Date) => date.toISOString().slice(0, 10)
const hoursBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / HOUR

/** O começo do período: a segunda-feira de `weeks - 1` semanas atrás. */
export function metricsStart(now: Date, weeks: number): Date {
  return new Date(weekStartOf(now).getTime() - (weeks - 1) * 7 * DAY)
}

export function computeMetrics(data: MetricsData, now: Date, weeks = 8): Metrics {
  const start = metricsStart(now, weeks)
  const inRange = (date: Date) => date >= start && date <= now
  const merged = data.merged.filter((pr) => inRange(pr.mergedAt))
  const reviews = data.reviewsGiven.filter(inRange)

  const buckets = Array.from({ length: weeks }, (_, index) => {
    const weekStart = new Date(start.getTime() + index * 7 * DAY)
    return { weekStart: key(weekStart), merged: [] as MergedPullRequestFacts[], reviews: 0 }
  })
  const bucketOf = (date: Date) =>
    buckets.find((bucket) => bucket.weekStart === key(weekStartOf(date)))
  for (const pr of merged) bucketOf(pr.mergedAt)?.merged.push(pr)
  for (const review of reviews) {
    const bucket = bucketOf(review)
    if (bucket) bucket.reviews += 1
  }

  return {
    weeks: buckets.map((bucket) => ({
      weekStart: bucket.weekStart,
      merged: bucket.merged.length,
      reviews: bucket.reviews,
      medianHoursToMerge: median(
        bucket.merged.map((pr) => hoursBetween(pr.createdAt, pr.mergedAt)),
      ),
    })),
    totals: {
      merged: merged.length,
      reviews: reviews.length,
      medianHoursToMerge: median(merged.map((pr) => hoursBetween(pr.createdAt, pr.mergedAt))),
      medianHoursToFirstReview: median(
        merged.flatMap((pr) =>
          pr.firstReviewAt ? [hoursBetween(pr.createdAt, pr.firstReviewAt)] : [],
        ),
      ),
      medianLines: median(merged.flatMap((pr) => (pr.lines === null ? [] : [pr.lines]))),
    },
  }
}
