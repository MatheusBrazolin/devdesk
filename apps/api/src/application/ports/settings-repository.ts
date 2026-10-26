/** Guarda as configurações como vieram; quem lê valida e completa com os padrões. */
export interface SettingsRepository {
  get(userId: string): Promise<unknown>
  save(userId: string, data: unknown, now: Date): Promise<void>
}
