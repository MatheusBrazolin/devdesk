# 0002. Arquitetura hexagonal na API

- **Status:** aceito
- **Data:** 2026-10-23

## Contexto

A API vai falar com o GitHub, com o banco e, depois, com outros serviços (calendário, notificações). A regra de negócio ("quais PRs pedem a sua atenção") precisa ser testável sem nenhum deles.

## Decisão

Camadas `domain`, `application` (portas e casos de uso), `infrastructure` e `http`, com a dependência apontando só para dentro. A ligação entre portas e implementações fica num único `container.ts`. Regras do ESLint impedem `domain` e `application` de importar Fastify, Drizzle ou a infraestrutura.

Fastify em vez de NestJS: a arquitetura fica explícita no código, em vez de escondida em decorators.

## Consequências

- Casos de uso e rotas são testados com adaptadores em memória, sem banco nem rede.
- Trocar o Postgres ou o cliente do GitHub mexe só em `infrastructure`.
- Há mais arquivos do que num CRUD direto. O custo é aceito porque a lógica de "Meu dia" vai crescer.
