import { describe, expect, it } from 'vitest'
import { connectionUrl } from './client.js'

describe('connectionUrl', () => {
  it('aceita a URL do Neon como ela vem, sem o parâmetro que o driver não conhece', () => {
    const url = connectionUrl(
      'postgresql://user:segredo@ep-x.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    )
    expect(url).toBe(
      'postgresql://user:segredo@ep-x.us-east-1.aws.neon.tech/neondb?sslmode=require',
    )
  })

  it('URL sem parâmetros fica igual', () => {
    expect(connectionUrl('postgres://devdesk:devdesk@localhost:5432/devdesk')).toBe(
      'postgres://devdesk:devdesk@localhost:5432/devdesk',
    )
  })
})
