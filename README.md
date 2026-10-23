# DevDesk

Painel de trabalho para desenvolvedores: o que pede a sua atenção no GitHub, suas notas e sua agenda, num lugar só.

> **Estado:** fase 1 (fundação) concluída. Login, layout e arquitetura prontos; os dados do GitHub chegam na fase 2.

## O que já funciona

- Login com GitHub (OAuth) e **modo demonstração**, para quem quer conhecer sem conectar uma conta
- Sessão por cookie `httpOnly`, com o token guardado só como hash; o token do GitHub fica cifrado (AES-256-GCM)
- Layout com sidebar animada, gaveta no celular, tema claro/escuro/sistema
- Paleta de comandos (<kbd>⌘</kbd> <kbd>K</kbd>) e atalhos no estilo do GitHub (<kbd>g</kbd> <kbd>p</kbd> vai para os pull requests)

## Roteiro

| Fase | Entrega                                                                           |
| ---- | --------------------------------------------------------------------------------- |
| 1 ✅ | Fundação: monorepo, CI, login com GitHub, layout, ⌘K                              |
| 2    | **Meu dia**: reviews pedidas a você, seus PRs (CI, aprovações), issues, mergeados |
| 3    | **Notas** em markdown, com tags e vínculo com PRs e issues                        |
| 4    | **Calendário**: eventos, lembretes e prazos de milestones, com exportação `.ics`  |
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

### Ligando o login com GitHub

1. Em [github.com/settings/developers](https://github.com/settings/developers), crie um **OAuth App**:
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/api/auth/github/callback`
2. Copie o Client ID e gere um Client Secret para o `.env`.
3. Reinicie a API.

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
