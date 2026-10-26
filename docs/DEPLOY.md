# Publicando a demonstração

A demonstração pública roda numa imagem só: a API serve também o front
compilado. Só o **modo demonstração** fica ligado, com dados de exemplo; nada
de token pessoal (ele é recusado em produção) e nenhum acesso a contas reais.

## O que a imagem faz

- `Dockerfile` na raiz, em duas etapas: compila tudo e copia só o necessário
  para rodar (sem dependências de desenvolvimento, sem `.env`).
- Na subida, as migrações do banco rodam sozinhas.
- Cada visita ao modo demonstração ganha um usuário próprio. Visitas com mais
  de 24 horas são apagadas (com as notas e os eventos delas) quando alguém novo
  entra. O que um visitante escreve não aparece para o próximo.
- Cabeçalhos de segurança do Helmet, com política de conteúdo estrita: só
  scripts da própria origem, imagens só dos avatares do GitHub, sem `iframe`.

## Testando a imagem no seu computador

```bash
docker build -t devdesk .
docker run --rm -p 3333:3333 \
  -e DATABASE_URL=postgres://devdesk:devdesk@host.docker.internal:5432/devdesk \
  -e TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  -e DEMO_ENABLED=true \
  -e WEB_ORIGIN=http://localhost:3333 \
  -e API_PUBLIC_URL=http://localhost:3333/api \
  devdesk
```

Abra http://localhost:3333 e entre no modo demonstração. Fora do `localhost`,
os cookies exigem HTTPS (a imagem roda com `NODE_ENV=production`).

## No Render, com o banco no Neon

Os dois têm plano gratuito; o Postgres do Neon não expira (o do Render
gratuito some em 30 dias, por isso fica de fora).

1. No [Neon](https://neon.tech), crie um projeto na região **AWS US East 1
   (N. Virginia)**, a mesma do serviço no Render. Copie a URL de conexão
   (_Connection string_). Pode colar como vem: o app tira sozinho o
   `channel_binding`, que o driver não aceita.
2. No [Render](https://render.com), entre com o GitHub e dê acesso ao
   repositório.
3. **New → Blueprint** e escolha este repositório. O `render.yaml` cria o
   serviço `devdesk` e pede a `DATABASE_URL`: cole a URL do Neon ali.
4. O resto já vem pronto: a `TOKEN_ENCRYPTION_KEY` é gerada pelo Render e o
   endereço público sai de `RENDER_EXTERNAL_URL`.
5. Depois do primeiro deploy, `/api/health` responde `{"status":"ok"}`.

O serviço gratuito do Render dorme sem uso: a primeira visita depois de um
tempo leva alguns segundos para acordar. O banco do Neon também dorme e
acorda sozinho.

## Login com GitHub no site (opcional)

Sem estas variáveis, o site mostra só a demonstração.

1. Crie um OAuth App só para o site (github.com/settings/developers → New OAuth
   App) com o retorno `https://SEU-ENDERECO/api/auth/github/callback`.
2. No painel do Render, em _Environment_, preencha `GITHUB_CLIENT_ID` (público)
   e `GITHUB_CLIENT_SECRET` (gerado no OAuth App; só você cola).
3. Para ver também as organizações que bloqueiam apps de terceiros, cole o seu
   token pessoal em `GITHUB_PERSONAL_TOKEN`. Ele só é usado quando quem entra
   pelo OAuth é o dono dele ([ADR 0011](adr/0011-dono-pelo-oauth.md)); qualquer
   outra conta usa o próprio OAuth. Para copiar sem mostrar na tela:
   `grep ^GITHUB_PERSONAL_TOKEN= .env | cut -d= -f2- | pbcopy`.
4. Salve com _Save, rebuild, and deploy_.

Na primeira autorização, o GitHub lista as suas organizações com "Request" ou
"Grant". Não é preciso clicar: os dados delas chegam pelo token pessoal.
