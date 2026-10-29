/**
 * Inglês das mensagens de erro fixas da API (apps/api) e dos schemas em
 * packages/shared. A API responde em português; lib/api.ts passa a mensagem
 * por t(). Por isso a API só responde frases fixas, sem valores no meio.
 */
export default {
  // domain/errors.ts e error-handler.ts
  'Sessão inválida ou expirada.': 'Invalid or expired session.',
  'O GitHub recusou o acesso. Conecte a conta de novo.':
    'GitHub rejected the access. Connect your account again.',
  'Requisição inválida.': 'Invalid request.',
  'Muitas requisições. Tente em instantes.': 'Too many requests. Try again in a moment.',
  'Algo deu errado do nosso lado.': 'Something went wrong on our end.',
  'Rota não encontrada.': 'Route not found.',
  // Rotas
  'Os avisos com o app fechado estão desligados.':
    'Notifications while the app is closed are turned off.',
  'Segredo do agendador inválido.': 'Invalid scheduler secret.',
  'Evento não encontrado.': 'Event not found.',
  'Nota não encontrada.': 'Note not found.',
  'Login com GitHub não configurado.': 'GitHub sign-in is not configured.',
  'Modo pessoal desligado.': 'Personal mode is turned off.',
  'O modo pessoal só aceita acesso desta máquina.':
    'Personal mode only accepts access from this machine.',
  'O modo pessoal só aceita acesso pelo endereço local.':
    'Personal mode only accepts access through the local address.',
  'Origem não permitida.': 'Origin not allowed.',
  'Envie a requisição como JSON.': 'Send the request as JSON.',
  // Casos de uso
  'Digite o seu login para confirmar.': 'Type your username to confirm.',
  'O modo demonstração está desligado.': 'Demo mode is turned off.',
  'No modo demonstração não há conta do GitHub para ligar.':
    "In demo mode there's no GitHub account to connect.",
  'O GitHub recusou esse token. Confira se ele foi copiado inteiro e não expirou.':
    "GitHub rejected this token. Check that it was copied in full and hasn't expired.",
  'Agenda não encontrada.': 'Calendar not found.',
  'No modo demonstração a agenda de exemplo já vem conectada.':
    'In demo mode the sample calendar is already connected.',
  'Não consegui ler essa agenda. Confira se é o endereço secreto no formato iCal (.ics).':
    "Couldn't read this calendar. Check that it's the secret address in iCal (.ics) format.",
  'A agenda de exemplo não pode ser removida.': "The sample calendar can't be removed.",
  'No modo demonstração os avisos ficam só com o app aberto.':
    'In demo mode notifications only work while the app is open.',
  'Este navegador usa um serviço de push desconhecido.':
    'This browser uses an unknown push service.',
  'O token guardado não pôde ser lido. Conecte a conta de novo.':
    "The stored token couldn't be read. Connect your account again.",
  'O GitHub recusou o token.': 'GitHub rejected the token.',
  'Você chegou ao limite de agendas assinadas. Remova uma para adicionar outra.':
    "You've reached the limit of subscribed calendars. Remove one to add another.",
  // Falhas do GitHub (infrastructure/github): frase fixa, o detalhe fica no log da API
  'O GitHub não respondeu agora. Tente de novo em instantes.':
    "GitHub isn't responding right now. Try again in a moment.",
  'O GitHub respondeu de um jeito inesperado. Tente de novo em instantes.':
    'GitHub responded in an unexpected way. Try again in a moment.',
  'O GitHub recusou o login. Tente entrar de novo.':
    'GitHub rejected the sign-in. Try signing in again.',
  // Domínio: eventos e agendas
  'O último dia vem antes do primeiro.': 'The last day comes before the first.',
  'O fim precisa ser depois do começo.': 'The end must be after the start.',
  'Cole o endereço completo da agenda, começando com https://.':
    'Paste the full calendar address, starting with https://.',
  'O endereço da agenda precisa ser https://.': 'The calendar address must be https://.',
  'Endereço de agenda inválido.': 'Invalid calendar address.',
  'Por enquanto, só agendas do Google, do Outlook ou do iCloud.':
    'For now, only Google, Outlook or iCloud calendars.',
  // packages/shared (zod)
  'dê um nome': 'add a name',
  'cole o endereço da agenda': 'paste the calendar address',
  'período longo demais': 'period too long',
  'repositório no formato dono/nome': 'repository in owner/name format',
  'dê um título': 'add a title',
  'ano fora do intervalo': 'year out of range',
  'use o formato dono/repositorio': 'use the owner/repository format',
} satisfies Record<string, string>
