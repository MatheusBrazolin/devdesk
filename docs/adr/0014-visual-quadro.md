# 0014. Visual "Quadro" em todo o app

- **Status:** aceito
- **Data:** 2026-10-27

## Contexto

O DevDesk tinha uma paleta neutra e quente, barra lateral e temas claro e
escuro. O redesign do Hoje (direção "Quadro": escuro verde-floresta, acento
lima, quadro de PRs por situação) ficou bom o bastante para virar o visual do
app inteiro, e duas linguagens convivendo pareciam dois produtos.

## Decisão

- Os tokens semânticos (`--bg`, `--surface`, `--fg`, `--accent`…) passam a
  ter os valores do Quadro. Como os componentes só usam esses nomes, todas as
  telas mudam juntas, sem reescrever cada uma.
- Papéis das cores: o acento é ativo, foco e o que é bom (mergeado, aprovado);
  coral é o que pede ação; amarelo (`--warning`) é o que está parado ou
  esperando. Os mesmos valores existem com nome próprio (`q-*`).
- Escuro sempre: o tema claro e a escolha de tema saíram.
- Barra superior com navegação em pílula em todas as páginas, no lugar da
  barra lateral; no foco, a navegação some; no modo TV, a barra toda.
- Raios na mesma régua (painel 22, card 14, controles em pílula), redefinidos
  no tema do Tailwind; fontes Bricolage Grotesque e DM Mono pelo `@fontsource`.
- Proibido: gradientes, emojis, ícone em quadradinho colorido, borda lateral
  colorida, sombra forte. Transições de 120 a 150 ms, só em hover e foco.

## Consequências

- Contraste medido: o texto mais fraco dá 5,3:1 sobre o card; o teste de
  acessibilidade (axe) passa em todas as páginas.
- Quem preferia o tema claro perdeu a opção. Uma versão clara da paleta pode
  voltar como outro bloco de tokens, sem mexer nos componentes.

## Atualização (2026-10-28): grafite e lavanda

O modelo ficou, a cor não: o verde-floresta com lima pesava. A paleta passou
para grafite (fundo `#121214`, painéis `#19191d`, cards `#212126`) com acento
lavanda (`#b8a9ff`, texto sobre ele em `#17112e`). Coral e amarelo seguem nos
mesmos papéis. Os tokens `q-lime` viraram `q-accent`, para a próxima troca de
cor não precisar renomear nada. Contraste: o texto mais fraco dá 4,95:1 sobre
os cards, a lavanda como texto 7,75:1 e o texto sobre ela 8,8:1.
