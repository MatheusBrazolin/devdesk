/** Inglês das Configurações. A chave é o texto em português, exatamente como no código. */
export default {
  'Escolha de onde vêm os dados do GitHub, os avisos, o time e cuide dos seus dados.':
    'Choose where your GitHub data comes from, your notifications and your team, and look after your data.',
  'Acesso ao GitHub': 'GitHub access',
  Avisos: 'Notifications',
  'Repositórios do time': 'Team repositories',
  Idioma: 'Language',
  'O idioma do app neste navegador. Os dados de exemplo da demonstração continuam em português.':
    'The app language in this browser. The demo sample data stays in Portuguese.',
  'Seus dados': 'Your data',
  Privacidade: 'Privacy',
  Carregando: 'Loading',
  // Avisos
  'Não salvou': "Couldn't save",
  'As notificações do navegador estão ligadas. Escolha quais avisos chegam:':
    'Browser notifications are on. Choose which ones you get:',
  'As notificações do navegador estão desligadas (ligue no menu do usuário). Os avisos dentro da página seguem estas escolhas:':
    'Browser notifications are off (turn them on from the user menu). In-page notifications follow these choices:',
  'Review pedida': 'Review requested',
  'alguém pediu a sua review': 'someone requested your review',
  'Review atrasada': 'Overdue review',
  'pedida a você há mais de 24 h': 'requested from you more than 24 h ago',
  'Mudanças pedidas': 'Changes requested',
  'num PR seu': 'on one of your PRs',
  'CI falhou': 'CI failed',
  Conflito: 'Conflict',
  'num PR seu, com a branch de destino': 'on one of your PRs, with the target branch',
  'Pronto para merge': 'Ready to merge',
  'aprovado e com CI verde': 'approved with green CI',
  'Lembretes e reuniões': 'Reminders and meetings',
  'na hora dos lembretes e antes das reuniões': 'when reminders are due and before meetings',
  // Repositórios do time
  'Use o formato dono/repositorio.': 'Use the owner/repository format.',
  'Dá para escolher até {max} repositórios.': 'You can choose up to {max} repositories.',
  'Como escolher os repositórios': 'How to choose repositories',
  Automático: 'Automatic',
  Escolher: 'Choose',
  'O time sai dos repositórios em que você abre, revisa ou mergeia PRs, do mais frequente ao menos.':
    'The team comes from the repositories where you open, review or merge PRs, most frequent first.',
  Repositórios: 'Repositories',
  'Adicionar repositório': 'Add repository',
  'dono/repositorio': 'owner/repository',
  Adicionar: 'Add',
  '{count} de {max}. Só leitura: o DevDesk só olha os PRs abertos desses repositórios.':
    '{count} of {max}. Read-only: DevDesk only looks at open PRs in these repositories.',
  // Seus dados
  'Um arquivo JSON com as suas notas, eventos, agendas conectadas e configurações.':
    'A JSON file with your notes, events, connected calendars and settings.',
  'Baixar meus dados': 'Download my data',
  'Apaga a conta e tudo o que é dela, na hora e sem volta. Nada muda no GitHub.':
    'Deletes the account and everything in it, immediately and permanently. Nothing changes on GitHub.',
  'Apagar minha conta': 'Delete my account',
  'Apagar a conta': 'Delete account',
  Fechar: 'Close',
  'Saem agora: sessões, token do GitHub, notas, eventos, agendas conectadas, avisos e configurações. Não dá para desfazer. Se quiser, baixe seus dados antes.':
    "Removed right away: sessions, GitHub token, notes, events, connected calendars, notifications and settings. This can't be undone. Download your data first if you want.",
  Digite: 'Type',
  'para confirmar': 'to confirm',
  Cancelar: 'Cancel',
  'Apagar de vez': 'Delete permanently',
  // Acesso ao GitHub
  'No modo demonstração os dados são de exemplo. Entrando com o GitHub, aqui você liga um token pessoal para ver os repositórios da sua empresa.':
    "In demo mode the data is sample data. Once you sign in with GitHub, you can connect a personal token here to see your company's repositories.",
  'Token removido': 'Token removed',
  'Voltou para o login do GitHub.': 'Back to GitHub sign-in.',
  'Não removeu': "Couldn't remove",
  'Os dados vêm do seu token pessoal': 'Data comes from your personal token',
  ', conectado em {date}': ', connected on {date}',
  '. Ele fica cifrado e nunca volta para o navegador.':
    ". It's stored encrypted and never sent back to the browser.",
  'Remover token': 'Remove token',
  'Não aparecem os PRs e repositórios da sua empresa? Muitas organizações bloqueiam apps de terceiros, e o login pelo GitHub não enxerga o que é delas. Um token pessoal age como você e mostra o mesmo que o github.com, sem pedir nada à organização.':
    "Not seeing your company's PRs and repositories? Many organizations block third-party apps, so GitHub sign-in can't see their content. A personal token acts as you and shows the same as github.com, without asking the organization for anything.",
  'O token fica cifrado (AES-256-GCM) e só é usado para ler. O DevDesk nunca comenta, aprova nem faz merge, e você pode remover ou revogar o token a qualquer hora.':
    'The token is stored encrypted (AES-256-GCM) and only used for reading. DevDesk never comments, approves or merges, and you can remove or revoke the token at any time.',
  // Saúde do acesso
  'Dados vêm de': 'Data comes from',
  Validade: 'Expires',
  'até {date}': 'on {date}',
  'renova sozinho': 'renews automatically',
  'sem data para vencer': 'no expiration date',
  Organizações: 'Organizations',
  'nenhuma visível': 'none visible',
  'Cota da API': 'API quota',
  '{remaining} de {limit} chamadas, renova às {time}':
    '{remaining} of {limit} calls, resets at {time}',
  Situação: 'Status',
  'recusado pelo GitHub (venceu ou foi revogado)': 'rejected by GitHub (expired or revoked)',
  'seu token pessoal': 'your personal token',
  'o token pessoal configurado no servidor': 'the personal token configured on the server',
  'o login pelo GitHub': 'GitHub sign-in',
  // Aviso do token
  hoje: 'today',
  amanhã: 'tomorrow',
  'em {n} dias': 'in {n} days',
  'Token do GitHub recusado': 'GitHub token rejected',
  'Token do GitHub perto de vencer': 'GitHub token expiring soon',
  'O GitHub recusou o seu token pessoal.': 'GitHub rejected your personal token.',
  'Ele venceu ou foi revogado. Gere outro e cole abaixo: o painel volta na hora.':
    'It expired or was revoked. Generate a new one and paste it below: the dashboard comes right back.',
  'Seu token pessoal vence {when}.': 'Your personal token expires {when}.',
  'Gere outro e cole abaixo antes disso, para o painel não esvaziar.':
    'Generate a new one and paste it below before then, so the dashboard keeps its data.',
  'O GitHub recusou o token configurado no servidor.':
    'GitHub rejected the token configured on the server.',
  'O token configurado no servidor vence {when}.':
    'The token configured on the server expires {when}.',
  'Gere outro em github.com/settings/tokens e troque a variável':
    'Generate a new one at github.com/settings/tokens and replace the variable',
  'no Render.': 'on Render.',
  'O GitHub não aceitou mais o acesso.': 'GitHub no longer accepts the access.',
  'Entre de novo para continuar.': 'Sign in again to continue.',
  'Entrar de novo': 'Sign in again',
  // Conectar o token
  'Abra o GitHub': 'Open GitHub',
  ': nome e permissões (': ': name and permissions (',
  ') já vêm preenchidos. Clique em "Generate token" e copie.':
    ') come pre-filled. Click "Generate token" and copy it.',
  'Volte aqui e cole o token no campo abaixo: ele conecta sozinho.':
    'Come back and paste the token in the field below: it connects on its own.',
  'Se a empresa usa SSO, clique em "Configure SSO" ao lado do token no GitHub e autorize.':
    'If your company uses SSO, click "Configure SSO" next to the token on GitHub and authorize it.',
  'Cole um token que comece com ghp_ ou github_pat_.':
    'Paste a token that starts with ghp_ or github_pat_.',
  'GitHub conectado': 'GitHub connected',
  'Buscando tudo de novo.': 'Fetching everything again.',
  'Token pessoal do GitHub': 'GitHub personal token',
  'Cole o token aqui (ghp_…)': 'Paste the token here (ghp_…)',
  Conectando: 'Connecting',
  Conectar: 'Connect',
} satisfies Record<string, string>
