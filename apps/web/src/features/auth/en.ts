/** Inglês da entrada (login e ilustração do painel). A chave é o texto em português, exatamente como no código. */
export default {
  'O login foi cancelado no GitHub.': 'Sign-in was canceled on GitHub.',
  'A tentativa de login expirou. Tente de novo.': 'The sign-in attempt expired. Try again.',
  'O GitHub não confirmou o login. Tente de novo em instantes.':
    "GitHub didn't confirm the sign-in. Try again in a moment.",
  'Não foi possível entrar.': "Couldn't sign in.",
  'Entrar no DevDesk': 'Sign in to DevDesk',
  'Reviews pendentes, seus pull requests e issues, junto com suas notas e sua agenda.':
    'Pending reviews, your pull requests and issues, alongside your notes and calendar.',
  'O GitHub recusou o token pessoal (revogado ou vencido). Gere outro e rode':
    'GitHub rejected the personal token (revoked or expired). Generate a new one and run',
  'Entrar como {login}': 'Sign in as {login}',
  'Continuar com GitHub': 'Continue with GitHub',
  'Ver a demonstração': 'Try the demo',
  'Modo pessoal: esta instalação usa o seu token do GitHub e só aceita acesso desta máquina.':
    'Personal mode: this install uses your GitHub token and only accepts access from this machine.',
  'Esta é uma demonstração pública, com dados de exemplo: nada aqui está ligado a uma conta real. Para ver o seu próprio GitHub, rode o DevDesk na sua máquina.':
    'This is a public demo with sample data: nothing here is linked to a real account. To see your own GitHub, run DevDesk on your machine.',
  'O GitHub vai pedir acesso aos seus repositórios, porque OAuth Apps não têm uma permissão só de leitura. O DevDesk apenas lê: não comenta, não aprova e não faz merge. Se a sua empresa bloqueia apps de terceiros, depois de entrar conecte um token pessoal em Configurações.':
    "GitHub will ask for access to your repositories because OAuth Apps don't have a read-only permission. DevDesk only reads: it never comments, approves or merges. If your company blocks third-party apps, connect a personal token in Settings after signing in.",
  'Privacidade: o que fica guardado e como apagar': 'Privacy: what is stored and how to delete it',
  // Ilustração do painel
  'Retentativa com backoff no webhook de pagamento': 'Retry with backoff on the payment webhook',
  'review pedida a você': 'review requested from you',
  'aguardando você': 'waiting on you',
  'Migra a tabela de pedidos para paginação por cursor':
    'Move the orders table to cursor pagination',
  'seu PR · 2 aprovações': 'your PR · 2 approvals',
  'CI passou': 'CI passed',
  'Filtro de data some ao voltar da página de detalhes':
    'Date filter disappears when coming back from the details page',
  'atribuída a você': 'assigned to you',
  'Atualiza o Postgres do staging para a 17': 'Upgrade staging Postgres to 17',
  'mergeado ontem': 'merged yesterday',
  mergeado: 'merged',
  'Precisa da sua atenção': 'Needs your attention',
  '{n} item': '{n} item',
  '{n} itens': '{n} items',
  'Exemplo ilustrativo do painel. Com a sua conta, a lista vem dos seus repositórios.':
    'Illustrative example of the dashboard. With your account, the list comes from your repositories.',
  'Login com GitHub desligado: defina {id} e {secret} no {env}.':
    'GitHub login is off: set {id} and {secret} in {env}.',
} satisfies Record<string, string>
