/**
 * Uma requisição só traz as quatro listas do painel. Cada `search` custa
 * pontos do limite do GraphQL, por isso as listas são cortadas em 30.
 */
export const DASHBOARD_QUERY = /* GraphQL */ `
  query Dashboard(
    $reviewQuery: String!
    $authoredQuery: String!
    $issuesQuery: String!
    $mergedQuery: String!
  ) {
    reviewRequested: search(type: ISSUE, query: $reviewQuery, first: 30) {
      issueCount
      nodes {
        ...PullRequestFields
      }
    }
    authored: search(type: ISSUE, query: $authoredQuery, first: 30) {
      issueCount
      nodes {
        ...PullRequestFields
      }
    }
    merged: search(type: ISSUE, query: $mergedQuery, first: 20) {
      issueCount
      nodes {
        ...PullRequestFields
      }
    }
    issues: search(type: ISSUE, query: $issuesQuery, first: 30) {
      issueCount
      nodes {
        ...IssueFields
      }
    }
  }

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
  }

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
  }
`

const ARCHIVED = 'archived:false'

export function dashboardVariables(mergedSince: Date) {
  const since = mergedSince.toISOString().slice(0, 10)
  return {
    reviewQuery: `is:pr is:open review-requested:@me ${ARCHIVED}`,
    authoredQuery: `is:pr is:open author:@me ${ARCHIVED}`,
    issuesQuery: `is:issue is:open assignee:@me ${ARCHIVED}`,
    mergedQuery: `is:pr is:merged author:@me merged:>=${since}`,
  }
}
