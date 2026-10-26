/**
 * As quatro listas do painel, cada uma numa consulta. Em paralelo elas
 * respondem em cerca de metade do tempo de uma consulta única com tudo
 * (medido: ~2 s contra ~4–5 s). O custo no limite do GraphQL é o mesmo,
 * porque ele conta pelos dados pedidos, não pelo número de requisições.
 */

const PULL_REQUEST_FIELDS = /* GraphQL */ `
  fragment PullRequestFields on PullRequest {
    __typename
    id
    number
    title
    url
    isDraft
    createdAt
    updatedAt
    mergedAt
    reviewDecision
    mergeable
    repository {
      nameWithOwner
    }
    author {
      login
      avatarUrl
    }
    comments {
      totalCount
    }
    additions
    deletions
    changedFiles
    # Quem ainda precisa revisar (para o lembrete de PR parado).
    reviewRequests(first: 10) {
      nodes {
        requestedReviewer {
          __typename
          ... on User {
            login
          }
          ... on Team {
            name
          }
        }
      }
    }
    # O último pedido de review: "esperando desde".
    timelineItems(itemTypes: [REVIEW_REQUESTED_EVENT], last: 1) {
      nodes {
        ... on ReviewRequestedEvent {
          createdAt
        }
      }
    }
    latestOpinionatedReviews(first: 20) {
      nodes {
        state
      }
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
          }
        }
      }
    }
    milestone {
      title
      dueOn
      url
    }
  }
`

/** Mergeado não tem CI, aprovação nem conflito que importem: só o essencial. */
const MERGED_FIELDS = /* GraphQL */ `
  fragment PullRequestFields on PullRequest {
    __typename
    id
    number
    title
    url
    isDraft
    createdAt
    updatedAt
    mergedAt
    reviewDecision
    mergeable
    repository {
      nameWithOwner
    }
    author {
      login
      avatarUrl
    }
    comments {
      totalCount
    }
    additions
    deletions
    changedFiles
    milestone {
      title
      dueOn
      url
    }
  }
`

const ISSUE_FIELDS = /* GraphQL */ `
  fragment IssueFields on Issue {
    __typename
    id
    number
    title
    url
    createdAt
    updatedAt
    repository {
      nameWithOwner
    }
    author {
      login
      avatarUrl
    }
    comments {
      totalCount
    }
    labels(first: 6) {
      nodes {
        name
        color
      }
    }
    milestone {
      title
      dueOn
      url
    }
  }
`

const search = (first: number, spread: string, fragment: string) => /* GraphQL */ `
  query DashboardList($q: String!) {
    search(type: ISSUE, query: $q, first: ${first}) {
      issueCount
      nodes { ...${spread} }
    }
  }
  ${fragment}
`

export type DashboardList = 'reviewRequested' | 'authored' | 'merged' | 'issues'

export const DASHBOARD_QUERIES: Record<DashboardList, string> = {
  reviewRequested: search(30, 'PullRequestFields', PULL_REQUEST_FIELDS),
  authored: search(30, 'PullRequestFields', PULL_REQUEST_FIELDS),
  merged: search(20, 'PullRequestFields', MERGED_FIELDS),
  issues: search(30, 'IssueFields', ISSUE_FIELDS),
}

const ARCHIVED = 'archived:false'
/**
 * Cada lista vem cortada (30, ou 20 nos mergeados). Ordenar pelos mais
 * recentes faz o corte ficar com os mais relevantes, em vez da ordem de
 * "melhor correspondência" da busca, que não tem nada a ver com o painel.
 */
const RECENT = 'sort:updated-desc'

export function dashboardSearches(mergedSince: Date): Record<DashboardList, string> {
  const since = mergedSince.toISOString().slice(0, 10)
  return {
    reviewRequested: `is:pr is:open review-requested:@me ${ARCHIVED} ${RECENT}`,
    authored: `is:pr is:open author:@me ${ARCHIVED} ${RECENT}`,
    issues: `is:issue is:open assignee:@me ${ARCHIVED} ${RECENT}`,
    merged: `is:pr is:merged author:@me merged:>=${since} ${RECENT}`,
  }
}
