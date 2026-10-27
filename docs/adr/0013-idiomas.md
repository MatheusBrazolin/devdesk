# 0013. Português e inglês, com o texto em português como chave

- **Status:** aceito
- **Data:** 2026-10-27

## Contexto

O app nasceu em português, com uns 800 textos espalhados por 110 arquivos.
Para quem avalia o projeto de fora e para colegas que preferem inglês, faltava
a opção de idioma, sem uma biblioteca grande e sem reescrever as telas.

## Decisão

- `t('Texto em português')`: o texto em português é a própria chave. Em
  português nada muda; em inglês, sai do dicionário. Tradução que falta cai
  no português, nunca num buraco na tela.
- Cada pasta tem o seu `en.ts`, carregados juntos por `import.meta.glob`: o
  dicionário cresce junto com a pasta, sem um arquivo gigante.
- `{marcadores}` para valores e `tx()` quando o marcador é um elemento (um
  link, um código): a frase inteira vira uma chave, em vez de pedaços soltos.
- Trocar de idioma recarrega a página. Datas e números usam `LOCALE`, e textos
  guardados em constantes de módulo mudam junto, sem estado escondido.
- As mensagens de erro da API, que chegam em português, passam pelo mesmo
  dicionário no front. A API continua em português.
- Testes garantem que toda tradução tem os mesmos marcadores do original e que
  a mesma frase não tem duas traduções diferentes em pastas diferentes.

## Consequências

- Os testes e o padrão continuam em português; o inglês vale quando a pessoa
  escolhe ou quando o navegador não está em português.
- Os dados de exemplo da demonstração e o conteúdo vindo do GitHub ficam como
  são.
- Mensagens da API montadas com valores no meio só traduzem quando o front
  conhece o formato (por exemplo, os complementos do standup).
