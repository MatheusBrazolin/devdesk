import {
  bigint,
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { NoteLink } from '../../domain/note.js'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubId: bigint('github_id', { mode: 'number' }).unique(),
  login: text('login').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  isDemo: boolean('is_demo').notNull().default(false),
  accessTokenEncrypted: text('access_token_encrypted'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  /** Token pessoal que a própria pessoa colou: tem prioridade sobre o do OAuth. */
  personalTokenEncrypted: text('personal_token_encrypted'),
  personalTokenSavedAt: timestamp('personal_token_saved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
    tags: text('tags').array().notNull().default([]),
    pinned: boolean('pinned').notNull().default(false),
    links: jsonb('links').$type<NoteLink[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notes_user_updated_idx').on(table.userId, table.updatedAt),
    index('notes_tags_idx').using('gin', table.tags),
    index('notes_links_idx').using('gin', table.links),
  ],
)

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    kind: text('kind', { enum: ['event', 'reminder'] })
      .notNull()
      .default('event'),
    allDay: boolean('all_day').notNull(),
    /** Dia inteiro: datas sem fuso. */
    date: date('date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    /** Com horário: instantes. */
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    link: jsonb('link').$type<NoteLink>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('calendar_events_user_date_idx').on(table.userId, table.date),
    index('calendar_events_user_starts_idx').on(table.userId, table.startsAt),
    // O banco também impede misturar os dois jeitos de marcar o horário.
    check(
      'calendar_events_timing_check',
      sql`(${table.allDay} and ${table.date} is not null and ${table.startsAt} is null and ${table.endsAt} is null)
        or (not ${table.allDay} and ${table.startsAt} is not null and ${table.date} is null and ${table.endDate} is null)`,
    ),
  ],
)

/** Agendas externas assinadas pelo link .ics (Google, Outlook, iCloud). Só leitura. */
export const calendarSubscriptions = pgTable(
  'calendar_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    host: text('host').notNull(),
    /** O link dá acesso à agenda inteira: fica cifrado como os tokens. */
    urlEncrypted: text('url_encrypted').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('calendar_subscriptions_user_idx').on(table.userId)],
)

/** Navegadores que pediram avisos com o app fechado (Web Push). */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('push_subscriptions_user_idx').on(table.userId)],
)

/** O que já foi avisado por push, para a próxima rodada mandar só o que é novo. */
export const pushSeen = pgTable('push_seen', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  keys: text('keys').array().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Configurações da pessoa (avisos, repositórios do time), validadas na leitura. */
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Último retrato do painel por pessoa, para abrir na hora mesmo depois de reiniciar a API. */
export const dashboardSnapshots = pgTable('dashboard_snapshots', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Final do token usado: retrato de outra credencial não é servido. */
  credential: text('credential').notNull(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
})
