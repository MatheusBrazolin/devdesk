# 0004. Modo demonstração

- **Status:** aceito
- **Data:** 2026-10-23

## Contexto

O projeto também serve de portfólio. Pedir que alguém conecte a conta do GitHub só para conhecer a interface afasta quem está avaliando.

## Decisão

Um usuário de demonstração, criado sob demanda, com login de um clique. Ligado por padrão em desenvolvimento e desligado em produção, a menos que `DEMO_ENABLED=true`.

## Consequências

- A interface pode ser vista sem nenhuma credencial.
- A partir da fase 2, o modo demo precisa de dados de exemplo próprios, sempre identificados como tal na tela: o painel nunca apresenta dado inventado como se fosse real.
