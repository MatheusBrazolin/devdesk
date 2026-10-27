# 0012. Cada pessoa pode conectar o próprio token pessoal

- **Status:** aceito
- **Data:** 2026-10-27
- **Complementa:** [ADR 0011](0011-dono-pelo-oauth.md)

## Contexto

No site publicado, quem entra pelo OAuth App recebe um token que não enxerga
as organizações com "restrição de acesso de apps de terceiros". Para o dono
isso foi resolvido com o token pessoal dele numa variável do servidor (ADR
0011). Um colega que entrou pelo site viu o próprio nome, mas o painel veio
vazio: o trabalho dele fica numa dessas organizações. Pedir à organização que
libere o app está fora de questão.

## Decisão

- Em **Configurações → Acesso ao GitHub**, qualquer pessoa que entrou pelo
  GitHub pode colar um token pessoal (classic, com `repo` e `read:org`, ou
  fine-grained).
- Antes de guardar, a API confere com o GitHub que o token é **da mesma conta**
  (ID numérico) e, nos tokens classic, que os escopos estão lá.
- O token fica numa coluna própria, cifrado com AES-256-GCM, e tem prioridade
  sobre o do OAuth em todas as leituras. Um novo login pelo OAuth não apaga o
  token pessoal; remover nas Configurações volta para o OAuth.
- O token nunca volta para o navegador: a API só diz se ele existe e desde
  quando.
- Trocar o token esquece os resultados guardados de time, métricas e standup;
  o retrato do painel já é separado por token.
- Quando o painel vem todo zerado e não há token pessoal, o Hoje mostra uma
  dica que leva às Configurações.

## Consequências

- Colegas veem o trabalho das organizações deles sem nenhum pedido às
  organizações, como o dono já via.
- O servidor passa a guardar tokens pessoais de mais pessoas. A trava de só
  leitura continua valendo para todos, e cada pessoa revoga o próprio token em
  github.com/settings/tokens quando quiser.
- Organizações que exigem SSO pedem que a pessoa autorize o token para a
  organização ("Configure SSO"); organizações que proíbem tokens classic exigem
  um fine-grained aprovado por elas, e aí não há o que o DevDesk faça.
