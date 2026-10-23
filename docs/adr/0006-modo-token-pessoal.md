# 0006. Modo de token pessoal

- **Status:** aceito
- **Data:** 2026-10-23

## Contexto

Com o OAuth App configurado, o login funcionou, mas o painel veio quase vazio. Os PRs e issues do usuário estavam em repositórios privados de organizações que restringem OAuth Apps de terceiros. Nesse caso o GitHub não devolve erro: a busca simplesmente omite esses itens.

Um teste comparou sete caminhos da API usando o token do OAuth App e um token que age como o usuário:

- busca, `viewer.pullRequests`, `/issues`, notificações e leitura direta do repositório: bloqueados para o OAuth App (403 ou listas vazias); tudo visível com o token do usuário;
- o feed de atividade (`/users/:login/events`) passa pelo bloqueio, mas os eventos de PR trazem só número e link, sem título nem estado, e não incluem reviews pedidas nem atribuições feitas por outras pessoas. Não serve para montar o painel.

O usuário não quer pedir acesso às organizações.

## Decisão

Um segundo modo de autenticação, para uma instalação local de uma pessoa: a API lê `GITHUB_PERSONAL_TOKEN` (um PAT _classic_ com `repo` e `read:org`), e a tela de login mostra "Entrar como <dono do token>".

- O token passa pelo mesmo `GitHubTokenProvider` do OAuth: fica cifrado no banco e o painel não sabe de onde veio.
- A rota `POST /auth/personal` abre sessão sem credencial nenhuma, então só existe fora de produção e sem proxy (`TRUST_PROXY=0`), só aceita loopback, exige `Host` local (`localhost`, `127.0.0.1`, `[::1]`), recusa `Origin` de outro site e exige corpo JSON. O JSON impede um `POST` simples de outro site; o `Host` impede o _DNS rebinding_, em que um site aponta o próprio domínio para 127.0.0.1 e passa no teste do IP.
- PAT _fine-grained_ é recusado no setup: para repositórios de organização ele precisa da aprovação de cada uma, que é justamente o que este modo evita.

## Consequências

- O painel mostra o mesmo que o usuário vê no github.com, sem pedir nada às organizações.
- Uma organização ainda pode bloquear PATs _classic_ por política. O setup mostra o que o token enxerga por organização, então isso aparece na hora.
- O modo não serve para várias pessoas: quem chega na API entra como o dono do token. Por isso fica preso a `localhost` e desligado em produção. Para várias pessoas, o OAuth App continua sendo o caminho.
