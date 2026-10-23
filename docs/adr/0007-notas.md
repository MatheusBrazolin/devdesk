# 0007. Notas no banco do DevDesk, vinculadas por endereço

- **Status:** aceito
- **Data:** 2026-10-23

## Contexto

As notas servem para anotar o que não cabe no GitHub, ou que não deveria estar lá: o que perguntar na review, os passos de um deploy, um lembrete pessoal sobre uma issue. O DevDesk não pode escrever no GitHub (ver ADR 0006 e a trava de só leitura), então as notas não podem virar comentários.

## Decisão

- **As notas ficam no Postgres do DevDesk**, numa tabela `notes` por usuário.
- **O vínculo com um PR ou issue guarda só o endereço** (URL, repositório, número) e o título daquele momento, em `jsonb`. Mostrar o vínculo não exige consultar o GitHub, e um PR que some não quebra a nota.
- **Tags em `text[]`** e vínculos em `jsonb`, cada um com índice GIN, para filtrar por tag (`@>`) e por item vinculado (`@>`) direto no banco.
- **O título pode ficar vazio:** o banco guarda o que foi digitado, e a API devolve também um `displayTitle` com a primeira linha do corpo. Assim a nota acompanha o texto enquanto não ganha um título próprio.
- **Salvamento automático** com atraso curto, sem botão de salvar. Não há controle de conflito entre abas: com uma pessoa só por conta, o último salvamento vale.

## Consequências

- O que se escreve nas notas é privado: nada aparece no GitHub, e a equipe não vê.
- Se o título do PR mudar, o vínculo mostra o título antigo até a nota ser vinculada de novo. É aceitável, porque o link continua levando ao PR certo.
- Editar a mesma nota em duas abas ao mesmo tempo pode sobrescrever texto. Se isso virar problema, a saída é enviar a versão (`updatedAt`) e recusar salvamentos baseados numa versão antiga.
- O usuário de demonstração é compartilhado: quem testa a demo vê as notas dos outros visitantes. Num deploy público, a demo precisaria de um usuário por visita.
