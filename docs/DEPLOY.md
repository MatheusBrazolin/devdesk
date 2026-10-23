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

## No Render (sugestão: tem plano gratuito para Docker)

1. Crie um Postgres gratuito no [Neon](https://neon.tech) e copie a URL de
   conexão (com `?sslmode=require`).
2. No Render, **New → Blueprint** e escolha este repositório. O `render.yaml`
   cria o serviço `devdesk`.
3. No painel do serviço, cole a URL do banco em `DATABASE_URL`. A
   `TOKEN_ENCRYPTION_KEY` o Render gera sozinho.
4. Se o endereço final não for `https://devdesk.onrender.com`, ajuste
   `WEB_ORIGIN` e `API_PUBLIC_URL`.
5. Depois do primeiro deploy, `/api/health` responde `{"status":"ok"}`.

O plano gratuito do Render dorme sem uso: a primeira visita depois de um tempo
leva alguns segundos para acordar.

## Login com GitHub na demonstração (opcional)

Para deixar o login real ligado também, crie um OAuth App só para a demo
(github.com/settings/developers) com o callback
`https://SEU-ENDERECO/api/auth/github/callback` e preencha `GITHUB_CLIENT_ID` e
`GITHUB_CLIENT_SECRET` no painel. Sem eles, só o modo demonstração aparece.
