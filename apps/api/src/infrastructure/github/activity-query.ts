/**
 * Buscas da atividade de um período, para o standup. Só leitura: a trava
 * de `createReadOnlyFetch` vale aqui como em todo o resto.
 */

const REF_FIELDS = 'title url number repository { nameWithOwner }'

const search = (
  type: 'PullRequest' | 'Issue',
  extra = '',
  variables = '$q: String!',
) => /* GraphQL */ `
  query StandupActivity(${variables}) {
    search(type: ISSUE, query: $q, first: 30) {
      nodes { ... on ${type} { __typename ${REF_FIELDS} ${extra} } }
    }
  }
`

export const ACTIVITY_QUERIES = {
  merged: search('PullRequest'),
  opened: search('PullRequest'),
  // As reviews da própria pessoa, para saber quando e o que ela respondeu.
  reviewed: search(
    'PullRequest',
    'reviews(author: $login, last: 10) { nodes { state submittedAt } }',
    '$q: String!, $login: String!',
  ),
  closedIssues: search('Issue'),
} as const

export type ActivityList = keyof typeof ACTIVITY_QUERIES

/** Instante no formato que a busca do GitHub aceita: sem milissegundos. */
const stamp = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z')

export function activitySearches(from: Date, to: Date): Record<ActivityList, string> {
  const range = `${stamp(from)}..${stamp(to)}`
  return {
    merged: `is:pr author:@me merged:${range}`,
    opened: `is:pr author:@me created:${range}`,
    // reviewed-by não filtra pela data da review: busca os PRs mexidos desde o
    // início do período e as datas das reviews decidem.
    reviewed: `is:pr reviewed-by:@me -author:@me updated:>=${stamp(from)}`,
    closedIssues: `is:issue assignee:@me closed:${range}`,
  }
}
