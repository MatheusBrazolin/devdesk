# 0001. Monorepo com npm workspaces e Turborepo

- **Status:** aceito
- **Data:** 2026-10-23

## Contexto

O projeto tem front, API e um contrato entre os dois. Uma mudança de contrato mexe nos três ao mesmo tempo.

## Decisão

Um repositório só, com `apps/web`, `apps/api` e `packages/shared`, usando npm workspaces e Turborepo para orquestrar build, teste e typecheck com cache.

## Consequências

- Uma mudança de contrato cabe num PR só, e o typecheck pega a quebra dos dois lados.
- Quem avalia o projeto vê tudo num lugar.
- npm em vez de pnpm: vem com o Node e dispensa instalar outra ferramenta. Trocar depois é barato.
- Front e API não podem ter ciclos de release independentes sem esforço extra. Não é um problema enquanto o time é uma pessoa.
