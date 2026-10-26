import { z } from 'zod'

export const weekMetricsSchema = z.object({
  /** Segunda-feira da semana (UTC). */
  weekStart: z.iso.date(),
  merged: z.number().int().nonnegative(),
  reviews: z.number().int().nonnegative(),
  medianHoursToMerge: z.number().nonnegative().nullable(),
})

export const metricsSchema = z.object({
  isSample: z.boolean(),
  fetchedAt: z.iso.datetime(),
  weeks: z.array(weekMetricsSchema),
  totals: z.object({
    merged: z.number().int().nonnegative(),
    reviews: z.number().int().nonnegative(),
    medianHoursToMerge: z.number().nonnegative().nullable(),
    medianHoursToFirstReview: z.number().nonnegative().nullable(),
    medianLines: z.number().nonnegative().nullable(),
  }),
})

export type WeekMetrics = z.infer<typeof weekMetricsSchema>
export type Metrics = z.infer<typeof metricsSchema>
