import { describe, expect, it } from 'vitest'
import { computeMetrics, median, metricsStart, weekStartOf } from './metrics.js'

// Segunda, 26/10/2026, meio-dia UTC.
const NOW = new Date('2026-10-26T12:00:00Z')
const at = (iso: string) => new Date(iso)

describe('semanas', () => {
  it('a semana começa na segunda-feira', () => {
    expect(weekStartOf(at('2026-10-25T23:00:00Z')).toISOString().slice(0, 10)).toBe('2026-10-19')
    expect(weekStartOf(at('2026-10-26T01:00:00Z')).toISOString().slice(0, 10)).toBe('2026-10-26')
  })

  it('8 semanas terminam na semana atual', () => {
    expect(metricsStart(NOW, 8).toISOString().slice(0, 10)).toBe('2026-09-07')
  })
})

describe('mediana', () => {
  it('ímpar, par e vazio', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('métricas', () => {
  const metrics = computeMetrics(
    {
      merged: [
        // Abriu segunda, primeira review 4 h depois, merge em 24 h.
        {
          createdAt: at('2026-10-19T10:00:00Z'),
          firstReviewAt: at('2026-10-19T14:00:00Z'),
          mergedAt: at('2026-10-20T10:00:00Z'),
          lines: 120,
        },
        // Mesmo semana: 48 h até o merge, sem review.
        {
          createdAt: at('2026-10-20T10:00:00Z'),
          firstReviewAt: null,
          mergedAt: at('2026-10-22T10:00:00Z'),
          lines: 40,
        },
        // Semana atual: 2 h até o merge.
        {
          createdAt: at('2026-10-26T08:00:00Z'),
          firstReviewAt: at('2026-10-26T09:00:00Z'),
          mergedAt: at('2026-10-26T10:00:00Z'),
          lines: null,
        },
        // Fora do período: não conta.
        {
          createdAt: at('2026-08-01T10:00:00Z'),
          firstReviewAt: null,
          mergedAt: at('2026-08-02T10:00:00Z'),
          lines: 999,
        },
      ],
      reviewsGiven: [
        at('2026-10-21T10:00:00Z'),
        at('2026-10-21T15:00:00Z'),
        at('2026-10-26T11:00:00Z'),
      ],
    },
    NOW,
  )

  it('oito semanas, da mais antiga à atual', () => {
    expect(metrics.weeks).toHaveLength(8)
    expect(metrics.weeks.at(-1)?.weekStart).toBe('2026-10-26')
  })

  it('conta mergeados e reviews na semana certa', () => {
    const lastWeek = metrics.weeks.at(-2)!
    expect(lastWeek).toEqual({
      weekStart: '2026-10-19',
      merged: 2,
      reviews: 2,
      medianHoursToMerge: 36,
    })
    expect(metrics.weeks.at(-1)).toMatchObject({ merged: 1, reviews: 1, medianHoursToMerge: 2 })
  })

  it('totais do período, com medianas', () => {
    expect(metrics.totals).toEqual({
      merged: 3,
      reviews: 3,
      medianHoursToMerge: 24,
      medianHoursToFirstReview: 2.5,
      medianLines: 80,
    })
  })

  it('sem dados, zeros e medianas nulas', () => {
    expect(computeMetrics({ merged: [], reviewsGiven: [] }, NOW).totals).toEqual({
      merged: 0,
      reviews: 0,
      medianHoursToMerge: null,
      medianHoursToFirstReview: null,
      medianLines: null,
    })
  })
})
