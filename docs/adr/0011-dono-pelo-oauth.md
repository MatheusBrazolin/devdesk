# 0011. O dono entra pelo OAuth e usa o token pessoal

- **Status:** aceito
- **Data:** 2026-10-26
- **Complementa:** [ADR 0006](0006-modo-token-pessoal.md)

## Contexto

O modo de token pessoal (ADR 0006) só existe na máquina do dono: a rota que
abre sessão com o token não pede credencial nenhuma, então num endereço
público qualquer visitante entraria como ele. No site publicado, sobrava o
OAuth App, que não enxerga as organizações que bloqueiam apps de terceiros. O
dono quer ver as organizações também no site, sem pedir nada a elas.

## Decisão

O OAuth passa a servir para provar quem está entrando; os dados podem vir de
outro token.

- O site tem um OAuth App próprio ("DevDesk (demo online)"), com o retorno no
  endereço do Render.
- Ao concluir o login (`CompleteGitHubLogin`), se houver `GITHUB_PERSONAL_TOKEN`
  configurado e quem entrou for o dono dele, comparando o **ID numérico** do
  GitHub (o login pode ser trocado; o ID, não), o token guardado para a sessão
  é o pessoal. Daí em diante painel, standup e agenda usam esse token sem saber
  de onde ele veio.
- Qualquer outra conta segue com o próprio token do OAuth e nunca toca no do
  dono. Com o token pessoal revogado ou o GitHub fora, o dono entra pelo OAuth,
  como qualquer um.
- A rota de login direto (`POST /auth/personal`) continua desligada em
  produção: no site, a única entrada com GitHub é o OAuth.
- Na tela de autorização do GitHub, as organizações aparecem com "Request" e
  "Grant". Nenhum dos dois é usado: os dados chegam pelo token pessoal.

## Consequências

- No site publicado o dono vê o mesmo que no github.com, organizações
  incluídas, sem nenhum pedido a elas.
- O token pessoal passa a ficar guardado no Render, como variável secreta. A
  trava de só leitura continua valendo, mas um servidor comprometido levaria o
  token junto. Revogar o token em github.com/settings/tokens corta o acesso na
  hora; o dono continua entrando, só que sem as organizações.
- O OAuth App do site aparece no GitHub como "Never used" para o dono: os
  dados não passam por ele.
