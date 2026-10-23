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
- **O DevDesk só lê do GitHub.** Os tokens têm escopo de escrita (OAuth Apps e PATs _classic_ não oferecem leitura só), então a garantia está no código: toda chamada sai por `createReadOnlyFetch`, que só deixa passar HTTPS, `GET`, documentos GraphQL só com operações `query` e o endpoint de login do OAuth. O documento é lido com o parser oficial do GraphQL (um `#` dentro de uma string não esconde uma `mutation`), objetos `Request` são recusados e `POST`/`PUT`/`PATCH`/`DELETE` em repositórios nunca chegam à rede.
- Erros saem sempre no formato `{ error: { code, message } }`, definido em `@devdesk/shared`.

## O painel "Hoje"

```
GET /api/dashboard
  └─ GetDashboard (caso de uso)
       ├─ usuário demo?  → SampleWorkSource (dados de exemplo, isSample: true)
       ├─ retrato < 1 min    → serve o guardado
       ├─ retrato < 24 h     → serve o guardado e atualiza por trás (stale: true)
       └─ sem retrato/velho  → GitHubWorkSource (4 consultas GraphQL em paralelo)
  retratos: memória (InMemorySnapshotCache) na frente, Postgres atrás
  └─ buildAttentionList (domínio): decide o que pede atenção e em que ordem
```

- A regra de "o que precisa da sua atenção" mora em `domain/attention.ts`, sem dependência de nada: é a parte mais importante do produto e a mais testada.
- O adaptador do GitHub valida a resposta com Zod e descarta nós que não batem (por exemplo, repositórios de organização protegidos por SAML), sem perder o resto do painel.
- Token recusado pelo GitHub vira o erro `GITHUB_RECONNECT`, que não derruba a sessão: o front oferece reconectar em vez de jogar a pessoa no login.
- Em repositórios sem review obrigatória o GitHub não calcula a decisão de review; aí um pedido de mudança pesa mais que qualquer aprovação, e só sem pedido de mudança uma aprovação conta como "pronto para merge".
- Cada lista vem cortada (30, ou 20 nos mergeados) e ordenada pela atividade mais recente; os totais do resumo são os reais.
- O porquê de cada escolha está nos ADRs [0005](adr/0005-leitura-do-github.md) e [0009](adr/0009-abrir-na-hora.md).
- Se a atualização por trás descobrir um token recusado, a próxima requisição pede reconexão em vez de seguir mostrando dado velho.
- Há dois jeitos de entrar com o GitHub: OAuth App (várias pessoas) e token pessoal (uma pessoa, local). Os dois gravam o token pelo mesmo `GitHubTokenProvider`, então o painel não sabe qual foi usado. Ver [ADR 0006](adr/0006-modo-token-pessoal.md).

## Notas

- As notas ficam no Postgres do DevDesk (`notes`), com tags em `text[]` e vínculos em `jsonb`; índices GIN servem os filtros por tag e por PR vinculado. Ver [ADR 0007](adr/0007-notas.md).
- Toda consulta leva o dono (`userId`): uma nota de outra pessoa responde 404, nunca 403, para não revelar que ela existe.
- As regras ficam no domínio (`domain/note.ts`): tags normalizadas ("Bug", "#bug" e "bug" são a mesma), título vindo da primeira linha quando vazio e vínculos sem repetição.
- O front salva com atraso de 700 ms depois da última tecla e grava na hora ao trocar de nota ou sair da página. A lista lateral acompanha a edição por atualização otimista do cache.
- O markdown é renderizado sem HTML cru e com links `javascript:` neutralizados, então colar algo malicioso numa nota não executa nada.

## Calendário

- **Dia inteiro é data, com horário é instante.** Um evento de dia inteiro guarda `date` (e `end_date`), sem fuso; um com horário guarda `starts_at` (e `ends_at`) em UTC. Uma restrição `CHECK` no banco impede misturar os dois. Ver [ADR 0008](adr/0008-calendario.md).
- O front sempre trabalha com a data local de quem olha (`lib/calendar-dates.ts`). A API devolve os eventos com horário com um dia de folga de cada lado, e o front recorta no fuso dele.
- **Prazos** são as milestones com data dos seus PRs e issues, tiradas do mesmo retrato do GitHub que o painel usa (sem consulta extra). Têm rota própria, `/calendar/deadlines`, para que um GitHub lento ou fora do ar não segure os eventos.
- **`.ics`** é gerado por uma função pura (`http/ics.ts`), com escape, dobra de linhas em 75 bytes e CRLF conforme a RFC 5545. Lembretes ganham um alarme.

## Standup

- O front define o período (o dia útil anterior no fuso de quem pede; na segunda, desde sexta) e pede `GET /api/standup?from&to`.
- A API junta a atividade do período (`ActivitySource`: quatro buscas de leitura — mergeados, abertos, revisados e issues fechadas, com as reviews filtradas pela data de envio) ao retrato do painel, e o domínio (`domain/standup.ts`) monta "feito", "hoje" e "bloqueios". O mesmo PR pode estar em "feito" e em "hoje", porque são ações diferentes ("abri" ontem, "corrigir o CI" hoje); entre "hoje" e "bloqueios" ele nunca se repete.
- Limite conhecido: as revisões vêm dos até 50 PRs mexidos desde o início do período, os mais recentes primeiro. Quem revisa muito mais que isso por dia pode ver revisões faltando.
- O texto (Slack, Markdown ou simples) é montado no front, que também acrescenta os eventos de hoje da agenda.

## Web: organizada por feature

```
src/
  app/           roteador e rotas protegidas
  features/      auth, home, work, notes, calendar, standup, commands… cada uma com suas páginas e queries
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
