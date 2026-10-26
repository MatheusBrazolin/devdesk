# Segurança

## Como reportar uma falha

Achou uma vulnerabilidade? **Não abra uma issue pública.** Use o
[reporte privado do GitHub](https://github.com/MatheusBrazolin/devdesk/security/advisories/new)
(aba Security → Report a vulnerability). Ele chega só para o mantenedor.

Diga o que encontrou, como reproduzir e o impacto que você imagina. A resposta
vem em até 7 dias, e a correção sai o quanto antes, com crédito a quem reportou,
se quiser.

## Versões cobertas

Só a versão atual da branch `main`, que é a publicada em
https://devdesk-tklq.onrender.com.

## O que o DevDesk já faz para se proteger

- **Só leitura no GitHub:** uma trava no código recusa qualquer requisição de
  escrita, mesmo que um bug tente fazer uma.
- **Segredos cifrados:** token do GitHub e endereços de agenda ficam cifrados
  no banco (AES-256-GCM); a sessão guarda só o hash do token.
- **Sem SSRF:** o servidor só busca agendas no Google, Outlook e iCloud, e só
  entrega avisos a serviços de push conhecidos, inclusive depois de redirecionamentos.
- **Cabeçalhos de segurança:** CSP restrita, cookies `httpOnly` e `SameSite`,
  limite de requisições por IP.
- **Verificação contínua:** CodeQL a cada push e Dependabot toda semana.

Detalhes das decisões em [docs/adr](docs/adr).
