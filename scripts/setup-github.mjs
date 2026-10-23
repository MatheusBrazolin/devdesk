#!/usr/bin/env node
// Configura como o DevDesk acessa o GitHub e grava no .env.
//
//   npm run setup:github
//
// Dois modos:
//   1. Token pessoal (PAT classic): uso só seu. Age como você, então enxerga
//      repositórios de organizações que bloqueiam OAuth Apps.
//   2. OAuth App: para várias pessoas; cada organização precisa liberar.
//
// Segredos são lidos sem eco no terminal, conferidos com o GitHub antes de
// gravar e nunca impressos. O .env fica com permissão 600.

import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const argEnv = process.argv.indexOf('--env')
const envPath =
  argEnv > -1 ? process.argv[argEnv + 1] : fileURLToPath(new URL('../.env', import.meta.url))
const examplePath = fileURLToPath(new URL('../.env.example', import.meta.url))

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: process.stdin.isTTY,
})
let muted = false
const write = rl._writeToOutput.bind(rl)
// Enquanto o secret é digitado, o eco do terminal fica desligado.
rl._writeToOutput = (text) => {
  if (!muted) write(text)
}
const lines = rl[Symbol.asyncIterator]()

async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question)
  muted = hidden
  const { value = '' } = await lines.next()
  muted = false
  if (hidden) process.stdout.write('\n')
  // Alguns terminais embrulham o texto colado em marcadores invisíveis.
  // eslint-disable-next-line no-control-regex -- o ESC é justamente o que removemos
  return value.replace(/\x1b\[20[01]~/g, '').replace(/\s+/g, '')
}

/**
 * Pergunta ao GitHub se o par é válido, trocando um código inventado: com
 * credenciais certas a resposta é "bad_verification_code"; com erradas,
 * "incorrect_client_credentials" (ou "Not Found"). Nenhum token é criado.
 */
async function checkCredentials(id, secret) {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: secret, code: 'devdesk-setup-check' }),
    })
    const body = await response.json()
    // "Not Found" é a resposta para um Client ID que não existe.
    if (body.error === 'incorrect_client_credentials' || body.error === 'Not Found')
      return 'invalid'
    return body.error === 'bad_verification_code' ? 'valid' : 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Confere um token pessoal e mostra o que ele enxerga: quantos PRs abertos e
 * issues atribuídas há em cada dono. Só contagens, nunca títulos.
 */
async function inspectPersonalToken(token) {
  const headers = { authorization: `Bearer ${token}`, 'user-agent': 'devdesk-setup' }
  const user = await fetch('https://api.github.com/user', { headers })
  if (user.status === 401) return { valid: false }
  if (!user.ok) throw new Error(`GitHub respondeu ${user.status}`)
  const { login } = await user.json()
  const scopes = (user.headers.get('x-oauth-scopes') ?? '').split(',').map((s) => s.trim())

  const query = `query {
    prs: search(type: ISSUE, query: "is:pr is:open author:@me archived:false", first: 100) { nodes { ... on PullRequest { repository { owner { login } } } } }
    issues: search(type: ISSUE, query: "is:issue is:open assignee:@me archived:false", first: 100) { nodes { ... on Issue { repository { owner { login } } } } }
  }`
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const { data } = await response.json()
  const byOwner = {}
  for (const [kind, result] of Object.entries(data ?? {})) {
    for (const node of result.nodes) {
      const owner = node?.repository?.owner?.login
      if (!owner) continue
      byOwner[owner] ??= { prs: 0, issues: 0 }
      byOwner[owner][kind] += 1
    }
  }
  return { valid: true, login, scopes, byOwner }
}

/** Troca o valor da chave no .env, ou acrescenta no fim. */
function setVar(content, key, value) {
  const line = `${key}=${value}`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  return pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`
}

const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''
const currentId = existing.match(/^GITHUB_CLIENT_ID=(.+)$/m)?.[1]?.trim()

function save(vars) {
  let content = existing || readFileSync(examplePath, 'utf8')
  for (const [key, value] of Object.entries(vars)) content = setVar(content, key, value)
  writeFileSync(envPath, content, { mode: 0o600 })
  chmodSync(envPath, 0o600)
}

console.log('Como o DevDesk vai acessar o GitHub?\n')
console.log('  1) Token pessoal (recomendado para uso só seu)')
console.log('     Age como você: vê os repositórios das suas organizações sem pedir nada a elas.')
console.log('  2) OAuth App (para várias pessoas)')
console.log('     Cada organização precisa liberar o app.\n')
console.log('Responda só com o número. O token é pedido no passo seguinte, sem aparecer na tela.')
// A escolha fica oculta também: se alguém colar o token aqui por engano, ele não aparece.
const choice = await ask('Digite 1 ou 2 e aperte Enter [1]: ', { hidden: true })
if (/^gh[a-z]_|^github_pat_/.test(choice)) {
  console.error('\nIsso é um token, colado no lugar da escolha. Ele não foi gravado nem exibido.')
  console.error('Rode o comando de novo e responda 1 primeiro.')
  process.exit(1)
}
if (!['', '1', '2'].includes(choice)) {
  console.error(`\nResposta inválida: escolha 1 ou 2. Nada foi alterado.`)
  process.exit(1)
}
const mode = choice || '1'
console.log(mode === '1' ? 'Token pessoal.' : 'OAuth App.')

if (mode === '1') {
  console.log('\nToken pessoal (classic), criado em github.com/settings/tokens/new')
  console.log('  Escopos: repo e read:org. Começa com ghp_. O que você colar não aparece na tela.')
  const token = await ask('  Cole aqui e aperte Enter: ', { hidden: true })
  rl.close()

  if (token.startsWith('github_pat_')) {
    console.error('\nEsse é um token fine-grained. Para repositórios de organização ele precisa')
    console.error('da aprovação de cada uma, que é o que o modo pessoal evita. Gere um classic.')
    process.exit(1)
  }
  if (!/^gh[po]_[A-Za-z0-9]{30,}$/.test(token)) {
    console.error(
      `\nIsso não parece um token do GitHub (recebi ${token.length} caracteres). Nada foi alterado.`,
    )
    process.exit(1)
  }

  process.stdout.write('\nConferindo com o GitHub… ')
  const info = await inspectPersonalToken(token)
  if (!info.valid) {
    console.error('recusado. O token não vale (revogado ou vencido). Nada foi alterado.')
    process.exit(1)
  }
  console.log(`ok, é ${info.login}.`)

  const missing = ['repo', 'read:org'].filter((scope) => !info.scopes.includes(scope))
  if (missing.length > 0) {
    console.log(
      `  Atenção: faltam os escopos ${missing.join(', ')}; repositórios privados podem não aparecer.`,
    )
  }

  const owners = Object.entries(info.byOwner)
  console.log('\nO que esse token enxerga agora:')
  if (owners.length === 0) console.log('  nenhum PR aberto seu nem issue atribuída a você.')
  for (const [owner, counts] of owners) {
    console.log(`  ${owner.padEnd(24)} ${counts.prs} PRs abertos · ${counts.issues} issues`)
  }

  save({ GITHUB_PERSONAL_TOKEN: token })
  console.log(`\nSalvo em ${envPath} (GITHUB_PERSONAL_TOKEN, não exibido).`)
  console.log('Reinicie a API e entre pelo botão "Entrar como ' + info.login + '".')
} else {
  console.log('Credenciais do OAuth App do GitHub')
  console.log('Página do app: github.com/settings/developers → OAuth Apps → DevDesk (local)\n')

  console.log('1) Client ID: o texto logo abaixo do título "Client ID" (começa com Ov23li).')
  const typedId = await ask(
    currentId
      ? `   Cole aqui, ou só Enter para manter o atual (…${currentId.slice(-4)}): `
      : '   Cole aqui: ',
    { hidden: true },
  )
  const clientId = typedId || currentId || ''
  if (/^gh[a-z]_|^github_pat_/.test(clientId)) {
    console.error('\nIsso é um token pessoal, não um Client ID. Nada foi alterado.')
    process.exit(1)
  }
  console.log(`   Client ID …${clientId.slice(-4)}`)
  if (!/^[A-Za-z0-9._-]{16,}$/.test(clientId)) {
    console.error('\nEsse Client ID não parece válido. Nada foi alterado.')
    process.exit(1)
  }

  console.log(
    '\n2) Client Secret: clique em "Generate a new client secret" e use o botão de copiar',
  )
  console.log('   ao lado do valor novo (40 letras e números, aparece uma vez só).')
  console.log('   Não cole o Client ID aqui. O que você colar não vai aparecer na tela.')
  const clientSecret = await ask('   Cole aqui e aperte Enter: ', { hidden: true })
  console.log(
    `   Recebi ${clientSecret.length} caracteres${clientSecret.length === 40 ? '.' : ' (o esperado são 40).'}`,
  )
  if (clientSecret === clientId) {
    console.error('\nIsso é o Client ID, não o secret. Nada foi alterado.')
    process.exit(1)
  }
  if (!/^[A-Za-z0-9]{30,}$/.test(clientSecret)) {
    console.error('\nEsse Client Secret não parece válido. Nada foi alterado.')
    process.exit(1)
  }

  process.stdout.write('\nConferindo com o GitHub… ')
  const check = await checkCredentials(clientId, clientSecret)
  if (check === 'invalid') {
    console.error('recusado.')
    console.error('O GitHub não aceitou esse par de Client ID e secret.')
    console.error(
      'Gere um secret novo na página do app e rode o comando de novo. Nada foi alterado.',
    )
    process.exit(1)
  }
  console.log(check === 'valid' ? 'ok.' : 'sem conexão; salvando sem conferir.')

  save({ GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: clientSecret })
  console.log(`\nSalvo em ${envPath}`)
  console.log(`  GITHUB_CLIENT_ID     …${clientId.slice(-4)}`)
  console.log('  GITHUB_CLIENT_SECRET (salvo, não exibido)')
  console.log('\nReinicie a API para o login com GitHub aparecer.')
  rl.close()
}
