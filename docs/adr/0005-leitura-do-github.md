# 0005. Leitura do GitHub: uma consulta GraphQL e cache curto

- **Status:** substituído em parte pelo [ADR 0009](0009-abrir-na-hora.md) (consultas em paralelo e retrato guardado)
- **Data:** 2026-10-23

## Contexto

O painel precisa de quatro listas: PRs com review pedida, PRs abertos da pessoa, PRs mergeados na semana e issues atribuídas. Para cada PR também interessam o status do CI, a decisão de review, o número de aprovações e se há conflito.

Pela API REST isso significa uma busca por lista e mais uma ou duas chamadas por PR (checks e reviews): dezenas de requisições a cada carregamento.

## Decisão

- **Uma consulta GraphQL** com quatro `search` em aliases, trazendo em cada PR `statusCheckRollup`, `reviewDecision`, `mergeable` e `latestOpinionatedReviews`. As listas são cortadas em 30 itens, e os totais vêm de `issueCount`.
- **Cache em memória por usuário, de 60 segundos**, atrás da porta `SnapshotCache`. O botão "atualizar" passa `refresh=true` e ignora o cache. Falhas não entram no cache.
- **A regra de atenção no domínio**, como função pura sobre o snapshot. Em repositórios sem review obrigatória o GitHub devolve `reviewDecision` nulo mesmo com aprovações; nesse caso, uma aprovação conta como aprovado. Esse comportamento foi visto em dados reais e está coberto por teste.

## Consequências

- Um carregamento custa uma requisição e poucos pontos do limite do GraphQL.
- O cache em memória não é compartilhado entre instâncias. Com mais de uma instância da API, a troca é por Redis ou por um snapshot no Postgres, mudando só a implementação da porta.
- Quem tem mais de 30 itens numa lista vê os 30 mais relevantes e o total correto no resumo. Paginação fica para quando alguém precisar.
- Os dados podem ter até um minuto de atraso, a menos que se clique em atualizar. Webhooks resolveriam, mas exigem um endpoint público e ficam para depois.
