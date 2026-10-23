# 0009. Abrir na hora: consultas em paralelo e retrato guardado

- **Status:** aceito
- **Data:** 2026-10-23
- **Substitui em parte:** [ADR 0005](0005-leitura-do-github.md)

## Contexto

Com o cache de 60 s do ADR 0005, cada visita depois de um minuto esperava o GitHub, e uma consulta única com as quatro listas levava de 4 a 5,8 s. Ao reiniciar a API o cache em memória sumia, e a primeira visita também esperava.

## Medições

Com os mesmos dados reais (12 PRs abertos, 12 mergeados, 3 issues), mediana de quatro a cinco execuções:

| Forma                                         | Tempo     |
| --------------------------------------------- | --------- |
| Uma consulta com as quatro buscas             | 4–5,8 s   |
| Uma consulta, mergeados sem CI e reviews      | 3,6 s     |
| Quatro consultas em paralelo, mergeados leves | **2,1 s** |

## Decisão

- **Quatro consultas em paralelo**, e a dos mergeados sem CI, reviews nem conflito, que não importam num PR já mergeado. O limite do GraphQL conta pelos dados pedidos, então o custo não muda.
- **Stale-while-revalidate.** Retrato com menos de 1 minuto é servido direto. Até 24 horas, é servido na hora, marcado `stale`, enquanto um novo é buscado por trás; o front pergunta de novo em 3 s. Mais velho que isso, ou ausente, espera o GitHub.
- **Retrato guardado no Postgres** (`dashboard_snapshots`, um por pessoa), atrás da memória. O formato tem versão: um retrato salvo num formato antigo é ignorado e vira uma busca nova, em vez de chegar quebrado ao painel.
- **Buscas em andamento são compartilhadas**: várias abas não disparam várias buscas.
- **Token recusado numa atualização por trás** marca a chave, e a próxima requisição pede reconexão em vez de seguir mostrando dado velho em silêncio.

## Consequências

- Medido depois: primeira carga 2,0 s; visitas seguintes 0,01–0,07 s, inclusive logo depois de reiniciar a API.
- O painel pode mostrar dados de até 24 h atrás por alguns segundos, mas diz isso ("atualizado há…") e se corrige sozinho.
- O retrato no banco contém títulos de PRs e issues de repositórios privados. Ele fica no Postgres local, como as notas, e some junto com o usuário.
