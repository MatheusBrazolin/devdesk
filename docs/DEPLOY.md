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

## Login com GitHub na demonstração (opcional)

Para deixar o login real ligado também, crie um OAuth App só para a demo
(github.com/settings/developers) com o callback
`https://SEU-ENDERECO/api/auth/github/callback` e preencha `GITHUB_CLIENT_ID` e
`GITHUB_CLIENT_SECRET` no painel. Sem eles, só o modo demonstração aparece.
