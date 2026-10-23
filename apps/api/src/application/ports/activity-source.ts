import type { Activity } from '../../domain/activity.js'

/** O que a pessoa fez no GitHub num período: base do "ontem" do standup. */
export interface ActivitySource {
  fetchActivity(accessToken: string, login: string, from: Date, to: Date): Promise<Activity>
}
