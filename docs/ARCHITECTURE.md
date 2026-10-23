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
- Erros saem sempre no formato `{ error: { code, message } }`, definido em `@devdesk/shared`.

## Web: organizada por feature

```
src/
  app/           roteador e rotas protegidas
  features/      auth, home, commands… cada uma com suas páginas e queries
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
