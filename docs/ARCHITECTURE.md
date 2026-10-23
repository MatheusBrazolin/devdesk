# Arquitetura

## Visão geral

```
navegador ──► Vite (:5173) ──/api──► Fastify (:3333) ──► PostgreSQL
                                          │
                                          └──► GitHub (OAuth, API)
```

Front e API ficam na **mesma origem**: em desenvolvimento o Vite faz proxy de `/api`, e em produção um proxy reverso faz o mesmo papel. Assim o cookie de sessão funciona sem CORS e sem `SameSite=None`.

## API: arquitetura hexagonal

```
src/
  domain/          entidades e regras puras (User, Session, AppError)
  application/
    ports/         interfaces que o negócio precisa (UserRepository, GitHubOAuth, TokenCipher…)
    use-cases/     um caso de uso por classe (CompleteGitHubLogin, GetCurrentUser…)
  infrastructure/  implementações das portas (Drizzle, fetch do GitHub, node:crypto)
  http/            Fastify: rotas, cookies, tradução de erro em status
  container.ts     raiz de composição: o único lugar que liga porta a implementação
  main.ts          sobe banco, migrações e servidor
```

A dependência só aponta para dentro: `http → application → domain`, e `infrastructure` implementa as portas de `application`. O ESLint **impõe** isso: importar Drizzle ou Fastify dentro de `domain/` ou `application/` quebra o lint.

O ganho prático aparece nos testes: os casos de uso e as rotas HTTP rodam com repositórios em memória e um GitHub falso (`test/helpers.ts`), sem banco e sem rede, em milissegundos.

### Sessão e segurança

- O cookie carrega um token aleatório de 256 bits; o banco guarda só o **SHA-256** dele. Um vazamento do banco não entrega sessões válidas.
- Cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção.
- O OAuth usa `state` aleatório guardado em cookie e comparado em tempo constante (proteção contra CSRF no callback).
- O token do GitHub é cifrado com **AES-256-GCM** antes de ir para o banco, e nunca sai da API: o `presentUser` escolhe campo a campo o que vai para o front.
- Os tokens do GitHub expiram em 8 horas. O `GitHubTokenProvider` renova 5 minutos antes, com o refresh token (válido por 6 meses), e grava o par novo. Como cada refresh token só vale uma vez, chamadas simultâneas do mesmo usuário compartilham a mesma renovação.
- **O DevDesk só lê do GitHub.** Os tokens têm escopo de escrita (OAuth Apps e PATs _classic_ não oferecem leitura só), então a garantia está no código: toda chamada sai por `createReadOnlyFetch`, que só deixa passar `GET`, `query` GraphQL e o endpoint de login do OAuth. `POST`/`PUT`/`PATCH`/`DELETE` em repositórios e qualquer `mutation` são recusados antes de chegar à rede.
- Erros saem sempre no formato `{ error: { code, message } }`, definido em `@devdesk/shared`.

## O painel "Hoje"

```
GET /api/dashboard
  └─ GetDashboard (caso de uso)
       ├─ usuário demo?  → SampleWorkSource (dados de exemplo, isSample: true)
       ├─ cache válido?  → InMemorySnapshotCache (60 s)
       └─ senão          → GitHubWorkSource (1 consulta GraphQL com 4 buscas)
  └─ buildAttentionList (domínio): decide o que pede atenção e em que ordem
```

- A regra de "o que precisa da sua atenção" mora em `domain/attention.ts`, sem dependência de nada: é a parte mais importante do produto e a mais testada.
- O adaptador do GitHub valida a resposta com Zod e descarta nós que não batem (por exemplo, repositórios de organização protegidos por SAML), sem perder o resto do painel.
- Token recusado pelo GitHub vira o erro `GITHUB_RECONNECT`, que não derruba a sessão: o front oferece reconectar em vez de jogar a pessoa no login.
- O porquê de cada escolha está no [ADR 0005](adr/0005-leitura-do-github.md).
- Há dois jeitos de entrar com o GitHub: OAuth App (várias pessoas) e token pessoal (uma pessoa, local). Os dois gravam o token pelo mesmo `GitHubTokenProvider`, então o painel não sabe qual foi usado. Ver [ADR 0006](adr/0006-modo-token-pessoal.md).

## Web: organizada por feature

```
src/
  app/           roteador e rotas protegidas
  features/      auth, home, work, commands… cada uma com suas páginas e queries
  components/
    ui/          design system (Button, Card, DropdownMenu…)
    layout/      shell, sidebar, topbar
  lib/           cliente da API, tema, navegação, utilitários
  styles/        tokens de cor e animações
```

- **Dados do servidor** ficam no TanStack Query. A rota protegida chama `ensureQueryData(meQuery)` no `beforeLoad`: sem sessão, redireciona para `/login` antes de renderizar.
- **Cores** são tokens semânticos (`bg-surface`, `text-fg-muted`, `bg-accent`) definidos em `app.css`, com uma versão para cada tema. Nenhum componente usa cor crua.
- **Navegação** tem uma fonte só (`lib/navigation.ts`), lida pela sidebar, pela paleta ⌘K e pelos atalhos `g + tecla`.
- **Animações** respeitam `prefers-reduced-motion`.
