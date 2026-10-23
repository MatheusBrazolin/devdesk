# 0010. Demonstração pública

- **Status:** aceito
- **Data:** 2026-10-23
- **Substitui em parte:** [ADR 0004](0004-modo-demonstracao.md)

## Contexto

Para servir de portfólio, o DevDesk precisa de um endereço que qualquer pessoa abra sem conectar conta. O ADR 0004 previa um único usuário de demonstração: num endereço público, a nota que um visitante escreve apareceria para o próximo, e o banco cresceria sem limite.

## Decisão

- **Um usuário demo por visita.** Cada clique em "modo demonstração" cria um usuário descartável. Ao entrar alguém novo, as visitas com mais de 24 horas são apagadas; as chaves estrangeiras com `cascade` levam sessões, notas e eventos junto. Sem tarefa agendada: a limpeza vem de carona no login, e uma falha nela não impede a entrada.
- **Uma imagem só.** A API serve o front compilado (`WEB_DIST_DIR`), na mesma origem: o cookie de sessão continua `SameSite=Lax` sem CORS, e há um serviço só para publicar. Rotas do app devolvem o `index.html`; `/api` continua JSON, inclusive no 404.
- **Política de conteúdo estrita.** Só scripts da própria origem (o script de tema saiu do HTML para um arquivo), imagens dos avatares do GitHub, nada de `iframe`.
- O modo de token pessoal continua recusado em produção (ADR 0006).

## Consequências

- Quem avalia o projeto entra com um clique e vê só o que criou.
- A demonstração não guarda nada por mais de um dia.
- O blueprint `render.yaml` e o guia `docs/DEPLOY.md` sobem tudo com o banco de fora (Neon ou outro Postgres).
