# Changelog

Mudanças que valem a pena saber, versão a versão. O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-10-27

Primeira versão publicada do DevDesk: o painel inteiro, no ar em [devdesk-tklq.onrender.com](https://devdesk-tklq.onrender.com).

### Painel e GitHub

- **Hoje**, um dashboard que cabe numa tela: indicadores, o que pede a sua atenção em ordem de urgência, mergeados por dia, idade dos seus PRs, carga por organização, PRs parados, agenda da semana e notas fixadas.
- **Fila de review inteligente**: reviews pedidas a você em ordem de prioridade, com tempo de espera, estimativa de leitura e aviso depois de 24 horas.
- **Lembrete pronto** para PR seu parado, com quem falta revisar, para colar no Slack ou no Teams.
- **Pull requests** e **Issues**: pedidos a você, seus abertos com CI e aprovações, mergeados da semana e issues por repositório.
- **Time**: PRs abertos nos repositórios em que você trabalha, quem espera há mais tempo e com quem as reviews acumulam.
- **Minhas métricas** das últimas 8 semanas: mergeados, tempo até o merge e até a primeira review, reviews feitas e tamanho típico dos PRs.
- **Só leitura no GitHub**: toda chamada passa por uma trava que só deixa sair `GET` e consultas GraphQL sem `mutation`.
- O painel **abre na hora**: mostra o último retrato guardado no Postgres e atualiza por trás.

### Notas, agenda e rotina

- **Notas** em markdown, com tags, fixadas no Hoje e vinculadas a PRs e issues, com modelos para review, deploy, 1:1 e investigação de bug.
- **Calendário** com eventos, lembretes e prazos das milestones, e exportação `.ics`.
- **Agendas conectadas**: Google Agenda, Outlook e iCloud pelo link `.ics`, inclusive reuniões que se repetem. O link fica cifrado e só provedores conhecidos são buscados.
- **Standup** montado do GitHub e da agenda, em Slack, Markdown ou texto.
- **Modo foco**: o item mais urgente, cronômetro de 25 ou 50 minutos, avisos segurados durante o bloco e o tempo livre até a próxima reunião.
- **Modo TV** com quatro arranjos (grade, coluna, faixa e mini) que se ajustam ao formato da janela, até 4K.

### Avisos

- Notificações de review pedida, CI quebrado, mudanças pedidas, conflito, PR pronto para merge, review atrasada, lembretes e reuniões.
- **Com o app fechado** (Web Push), numa rodada a cada 10 minutos disparada pelo GitHub Actions. Cada item avisa uma vez só.

### Conta e privacidade

- Login com GitHub (OAuth), token pessoal para uso local e **modo demonstração** com dados de exemplo.
- **Configurações**: quais avisos receber e quais repositórios formam o time.
- **LGPD**: página de privacidade, "Baixar meus dados" em JSON e "Apagar minha conta".
- Sessão por cookie `httpOnly`, guardada só como hash; token do GitHub cifrado com AES-256-GCM.

### Experiência

- App instalável (PWA), com atalhos no ícone e abas sincronizadas.
- Responsivo de 320 px a 4K, tema claro, escuro ou do sistema.
- Paleta de comandos (<kbd>⌘</kbd> <kbd>K</kbd>), atalhos no estilo do GitHub e ajuda com <kbd>?</kbd>.
- Acessibilidade sem violações do axe (WCAG AA) em todas as páginas.

### Qualidade e operação

- Monorepo com API Fastify em arquitetura hexagonal, SPA React e contratos Zod compartilhados.
- Testes unitários (Vitest) e de ponta a ponta (Playwright) no CI, com checagem das migrações.
- CodeQL, Dependabot e [política de segurança](SECURITY.md).
- Uma imagem Docker só, publicada no Render com o banco no Neon ([guia](docs/DEPLOY.md)).

[1.0.0]: https://github.com/MatheusBrazolin/devdesk/releases/tag/v1.0.0
