/** Inglês da página de privacidade. A chave é o texto em português, exatamente como no código. */
export default {
  'Voltar ao DevDesk': 'Back to DevDesk',
  Privacidade: 'Privacy',
  'Seus dados no DevDesk': 'Your data in DevDesk',
  'O DevDesk é um painel pessoal: mostra o seu trabalho no GitHub ao lado das suas notas e da sua agenda. Esta página diz o que fica guardado, como e por quanto tempo, e como levar ou apagar tudo. Vale a Lei Geral de Proteção de Dados (LGPD).':
    "DevDesk is a personal dashboard: it shows your GitHub work alongside your notes and calendar. This page explains what is stored, how and for how long, and how to take or delete all of it. The LGPD (Brazil's data protection law) applies.",
  'O que fica guardado': 'What is stored',
  'Perfil do GitHub:': 'GitHub profile:',
  'login, nome e foto, para mostrar quem está conectado.':
    'username, name and avatar, to show who is signed in.',
  'Token de acesso do GitHub:': 'GitHub access token:',
  'cifrado (AES-256-GCM). Serve só para ler; o DevDesk nunca comenta, aprova, edita nem faz merge, e uma trava no código recusa qualquer escrita.':
    'encrypted (AES-256-GCM). Used only for reading; DevDesk never comments, approves, edits or merges, and a guard in the code rejects any write.',
  'Token pessoal do GitHub, se você conectar um:': 'GitHub personal token, if you connect one:',
  'cifrado do mesmo jeito, usado só para ler e nunca devolvido ao navegador. Remover em Configurações apaga na hora.':
    'encrypted the same way, used only for reading and never sent back to the browser. Removing it in Settings deletes it immediately.',
  'O que você escreve:': 'What you write:',
  'notas, eventos, lembretes e configurações.': 'notes, events, reminders and settings.',
  'Agendas conectadas:': 'Connected calendars:',
  'o nome que você deu e o endereço secreto do .ics, cifrado. O endereço não volta para o navegador depois de salvo.':
    "the name you gave it and the secret .ics address, encrypted. The address isn't sent back to the browser once saved.",
  'Avisos com o app fechado:': 'Notifications while the app is closed:',
  'o endereço de entrega que o navegador cria, e quais avisos já foram mandados, para não repetir.':
    'the delivery endpoint your browser creates, and which notifications were already sent, to avoid repeats.',
  'Último retrato do painel:': 'Latest dashboard snapshot:',
  'uma cópia dos seus PRs e issues, para a tela abrir na hora. É substituída a cada atualização.':
    'a copy of your PRs and issues, so the page opens instantly. It is replaced on every refresh.',
  'O que não fica guardado': 'What is not stored',
  'Código, comentários ou conteúdo dos repositórios: só o que aparece no painel.':
    'Code, comments or repository content: only what appears on the dashboard.',
  'Senhas: o login é feito pelo próprio GitHub.': 'Passwords: sign-in is handled by GitHub itself.',
  'Rastreamento, anúncios ou análise de uso de terceiros: não há nenhum.':
    'Tracking, ads or third-party analytics: there are none.',
  'Por quanto tempo': 'For how long',
  'Sessão: 30 dias, ou até você sair.': 'Session: 30 days, or until you sign out.',
  'Modo demonstração: tudo o que a visita criou é apagado depois de 24 horas.':
    'Demo mode: everything the visit created is deleted after 24 hours.',
  'Conta: até você apagar. Ao apagar, tudo sai na hora, sem cópia guardada.':
    'Account: until you delete it. When you do, everything goes immediately, with no copy kept.',
  'Com quem os dados passam': 'Who the data passes through',
  'GitHub: de onde vêm os PRs, issues e reviews.':
    'GitHub: where PRs, issues and reviews come from.',
  'Google, Microsoft (Outlook) ou Apple (iCloud): só se você conectar uma agenda, para baixar o .ics.':
    'Google, Microsoft (Outlook) or Apple (iCloud): only if you connect a calendar, to download the .ics.',
  'Serviço de push do seu navegador (Google, Mozilla, Apple ou Microsoft): só o aviso, se você ligar as notificações.':
    "Your browser's push service (Google, Mozilla, Apple or Microsoft): only the notification, if you turn notifications on.",
  'Hospedagem: Render (servidor) e Neon (banco de dados), nos Estados Unidos.':
    'Hosting: Render (server) and Neon (database), in the United States.',
  'Seus direitos': 'Your rights',
  'Levar seus dados:': 'Take your data:',
  'em Configurações → Seus dados, "Baixar meus dados" gera um JSON com notas, eventos, agendas e configurações.':
    'in Settings → Your data, "Download my data" creates a JSON file with your notes, events, calendars and settings.',
  'Apagar a conta:': 'Delete your account:',
  'em Configurações → Seus dados. Leva junto sessões, tokens, notas, eventos, agendas, avisos e configurações.':
    'in Settings → Your data. It takes sessions, tokens, notes, events, calendars, notifications and settings with it.',
  'Tirar o acesso ao GitHub:': 'Revoke GitHub access:',
  'Dúvidas ou pedidos:': 'Questions or requests:',
  'abra uma issue em': 'open an issue at',
  '. O código é aberto: dá para conferir tudo o que está escrito aqui.':
    '. The code is open source: you can verify everything written here.',
  'em {link}, revogue o DevDesk.': 'go to {link} and revoke DevDesk.',
} satisfies Record<string, string>
