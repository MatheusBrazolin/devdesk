/** Inglês de PRs e issues. A chave é o texto em português, exatamente como no código. */
export default {
  // Linhas de issue e PR
  'issue aberta': 'open issue',
  'aberta por {autor}': 'opened by {autor}',
  'parada há {dias} dias': 'stale for {dias} days',
  'atualizada {quando}': 'updated {quando}',
  mergeado: 'merged',
  rascunho: 'draft',
  aberto: 'open',
  'mergeado {quando}': 'merged {quando}',
  'parado há {dias} dias': 'stale for {dias} days',
  'atualizado {quando}': 'updated {quando}',
  'aberto {quando}': 'opened {quando}',
  '{n} comentários': '{n} comments',
  '{linhas} linhas em {arquivos} arquivos': '{linhas} lines in {arquivos} files',
  '{n} linhas': '{n} lines',
  conflito: 'conflict',
  'mudanças pedidas': 'changes requested',
  '{n} aprovação': '{n} approval',
  '{n} aprovações': '{n} approvals',
  'sem review': 'no review',
  'CI ok': 'CI passed',
  'CI falhou': 'CI failed',
  'CI rodando': 'CI running',
  'review pedida': 'review requested',
  'pronto para merge': 'ready to merge',
  // Fila de review
  'pedida agora': 'requested just now',
  'esperando há {n} h': 'waiting {n}h',
  'esperando há {n} d': 'waiting {n}d',
  // Lembrete para quem revisa
  'Oi, {quem}! Quando der, consegue dar uma olhada no {pr}?':
    'Hi {quem}! When you get a chance, could you take a look at {pr}?',
  'Oi, pessoal! Quando der, consegue dar uma olhada no {pr}?':
    'Hi team! When you get a chance, could you take a look at {pr}?',
  '"{titulo}" está parado há {n} dia, esperando review.':
    '"{titulo}" has been waiting for review for {n} day.',
  '"{titulo}" está parado há {n} dias, esperando review.':
    '"{titulo}" has been waiting for review for {n} days.',
  'Lembrete copiado': 'Reminder copied',
  'Cole no Slack, no Teams ou no PR.': 'Paste it in Slack, Teams or the PR.',
  'Não deu para copiar sozinho': "Couldn't copy automatically",
  'Copiar lembrete para quem revisa {pr}': 'Copy reminder for the reviewers of {pr}',
  'Copiar lembrete para quem revisa': 'Copy reminder for reviewers',
  // Avisos
  'Review esperando há mais de 24 h: {pr}': 'Review waiting for over 24h: {pr}',
  '{n} itens novos pedem sua atenção': '{n} new items need your attention',
  // Páginas
  '{n} abertas e atribuídas a você': '{n} open and assigned to you',
  '{n} aberta e atribuída a você': '{n} open and assigned to you',
  'Nenhuma issue atribuída': 'No assigned issues',
  'Issues abertas atribuídas a você aparecem aqui, agrupadas por repositório.':
    'Open issues assigned to you show up here, grouped by repository.',
  'Nada com esse filtro': 'Nothing matches this filter',
  'Tente outra busca: o DevDesk ignora acentos e acha palavra por palavra.':
    'Try another search: accents are ignored and words can be in any order.',
  'Nenhuma review pedida': 'No review requests',
  'Quando alguém pedir a sua review, o PR aparece aqui.':
    'When someone requests your review, the PR shows up here.',
  'Nenhum PR aberto': 'No open PRs',
  'Seus pull requests abertos aparecem aqui, com CI e aprovações.':
    'Your open pull requests show up here, with CI and approvals.',
  'Nada mergeado nesta semana': 'Nothing merged this week',
  'PRs seus mergeados nos últimos 7 dias aparecem aqui.':
    'Your PRs merged in the last 7 days show up here.',
  'Pedidas a você': 'Requested from you',
  'Seus PRs': 'Your PRs',
  'Mergeados (7 dias)': 'Merged (7 days)',
  '{n} abertos': '{n} open',
  '{n} aberto': '{n} open',
  '{n} com aprovação': '{n} approved',
  '{n} com CI falhando': '{n} with failing CI',
  '{n} parados há mais de 7 dias': '{n} stale for more than 7 days',
  '{n} parado há mais de 7 dias': '{n} stale for more than 7 days',
  // Barra de busca e filtros
  'Prioridade de review': 'Review priority',
  'Atualizados recentemente': 'Recently updated',
  'Parados há mais tempo': 'Stale the longest',
  'Por repositório': 'By repository',
  Buscar: 'Search',
  'Buscar por título, repositório ou número': 'Search by title, repository or number',
  'Limpar busca': 'Clear search',
  Ordenar: 'Sort',
  'Filtrar por organização': 'Filter by organization',
  Todas: 'All',
  // Estado da sincronização e erros
  'Dados de exemplo': 'Sample data',
  'Do GitHub': 'From GitHub',
  'Atualizar agora': 'Refresh now',
  'Não foi possível atualizar': 'Couldn’t refresh',
  Carregando: 'Loading',
  'O GitHub não aceitou mais o acesso': 'GitHub access expired or was revoked',
  'Não deu para carregar os dados do GitHub': 'Couldn’t load the GitHub data',
  'O token pessoal foi revogado ou venceu. Gere outro e rode':
    'The personal token was revoked or expired. Generate a new one and run',
  'O token pode ter sido revogado ou expirado. Conecte a conta de novo para continuar.':
    'The token may have been revoked or expired. Reconnect your account to continue.',
  'Reconectar GitHub': 'Reconnect GitHub',
  'Tentar de novo': 'Try again',
} satisfies Record<string, string>
