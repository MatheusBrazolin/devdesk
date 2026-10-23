# DevDesk

Painel de trabalho para desenvolvedores: o que pede a sua atenção no GitHub, suas notas e sua agenda, num lugar só.

> **Estado:** fases 1 a 4 concluídas, e a 5 começou pelo standup automático.

## O que já funciona

- **Hoje**: o que precisa da sua atenção, em ordem de urgência: reviews pedidas a você, seus PRs com mudanças pedidas, CI quebrado ou conflito, e os prontos para merge
- **Pull requests**: pedidos a você, seus abertos (com CI e aprovações) e os mergeados na semana
- **Issues** atribuídas a você, agrupadas por repositório e com as labels
- **Notas** em markdown, com tags, fixadas no painel Hoje e vinculadas a PRs e issues: o botão de notas em cada linha abre ou cria a nota daquele item. Salvam sozinhas enquanto você escreve
- **Calendário** com eventos e lembretes (dia inteiro ou com horário), os prazos das milestones dos seus PRs e issues, a agenda da semana no painel Hoje, aviso na hora dos lembretes e exportação `.ics` para Google Agenda, Apple Calendar ou Outlook
- **Standup** pronto para colar: o que você mergeou, abriu, revisou e fechou no dia útil anterior (na segunda, desde sexta), o que pede atenção hoje e os PRs travados. Em Slack, Markdown ou texto, editável, com cópia e salvar como nota
- **Abre na hora:** o painel mostra o último retrato guardado e atualiza por trás; o retrato fica no Postgres, então nem depois de reiniciar a API é preciso esperar o GitHub
- **Só leitura no GitHub:** o DevDesk nunca comenta, aprova, edita nem faz merge; uma trava no código recusa qualquer escrita
- Login com GitHub (OAuth) e **modo demonstração**, para quem quer conhecer sem conectar uma conta
- Sessão por cookie `httpOnly`, com o token guardado só como hash; o token do GitHub fica cifrado (AES-256-GCM)
- Layout com sidebar animada, gaveta no celular, tema claro/escuro/sistema
- Paleta de comandos (<kbd>⌘</kbd> <kbd>K</kbd>) e atalhos no estilo do GitHub (<kbd>g</kbd> <kbd>p</kbd> vai para os pull requests)

## Roteiro

| Fase | Entrega                                                                           |
| ---- | --------------------------------------------------------------------------------- |
| 1 ✅ | Fundação: monorepo, CI, login com GitHub, layout, ⌘K                              |
| 2 ✅ | **Meu dia**: reviews pedidas a você, seus PRs (CI, aprovações), issues, mergeados |
| 3 ✅ | **Notas** em markdown, com tags e vínculo com PRs e issues                        |
| 4 ✅ | **Calendário**: eventos, lembretes e prazos de milestones, com exportação `.ics`  |
| 5    | Extras: standup gerado do que você fez ontem, modo foco, notificações             |

## Stack

| Camada    | Tecnologia                                                      |
| --------- | --------------------------------------------------------------- |
| Front     | React 19, Vite, TanStack Router e Query, Tailwind CSS 4, Motion |
| UI        | Componentes próprios sobre Radix, cmdk e lucide                 |
| API       | Node, Fastify 5, arquitetura hexagonal                          |
| Dados     | PostgreSQL 17, Drizzle ORM com migrações versionadas            |
| Contratos | Zod, num pacote compartilhado entre front e API                 |
| Qualidade | TypeScript estrito, Vitest, ESLint, Prettier, GitHub Actions    |

## Rodando localmente

Precisa de Node 24+ e Docker.

```bash
npm install
cp .env.example .env            # e preencha TOKEN_ENCRYPTION_KEY (openssl rand -base64 32)
npm run db:up                   # sobe o Postgres
npm run dev                     # API em :3333 e front em http://localhost:5173
```

As migrações rodam sozinhas quando a API sobe. Sem `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`, só o modo demonstração aparece no login.

### Conectando o GitHub

Rode `npm run setup:github` e escolha um dos dois modos. O comando confere tudo com o GitHub antes de gravar no `.env` e nunca mostra segredos na tela.

**1. Token pessoal (recomendado para uso só seu).** Crie um token _classic_ em [github.com/settings/tokens/new](<https://github.com/settings/tokens/new?scopes=repo,read:org&description=DevDesk%20(local)>) com os escopos `repo` e `read:org`. Ele age como você, então o painel enxerga os repositórios das suas organizações mesmo quando elas bloqueiam apps de terceiros, sem pedir nada a elas. O login vira um botão "Entrar como <você>". Só funciona fora de produção e só aceita acesso da própria máquina.

**2. OAuth App (para várias pessoas).** Em [github.com/settings/developers](https://github.com/settings/developers), crie um OAuth App com:

- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:5173/api/auth/github/callback`

Gere um Client Secret e informe os dois no setup. O escopo pedido é `read:user read:org repo`: OAuth Apps não têm permissão só de leitura para repositórios privados, então o GitHub mostra acesso de escrita na autorização, embora o DevDesk só faça leituras. Organizações que restringem OAuth Apps precisam liberar o app para os repositórios delas aparecerem.

Depois de qualquer um dos dois, reinicie a API.

## Estrutura

```
apps/
  api/           API Fastify, em camadas (domain → application → infrastructure → http)
  web/           SPA React, organizada por feature
packages/
  shared/        schemas Zod e tipos: o contrato entre front e API
docs/
  ARCHITECTURE.md
  adr/           registro das decisões de arquitetura
```

A arquitetura está explicada em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), e o porquê de cada escolha, em [docs/adr](docs/adr).

## Scripts

| Comando             | O que faz                              |
| ------------------- | -------------------------------------- |
| `npm run dev`       | API e front em modo watch              |
| `npm test`          | todos os testes                        |
| `npm run typecheck` | checagem de tipos em todos os pacotes  |
| `npm run lint`      | ESLint, incluindo as regras de camadas |
| `npm run build`     | build de produção                      |

## Licença

MIT
