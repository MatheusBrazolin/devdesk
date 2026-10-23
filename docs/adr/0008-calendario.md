# 0008. Calendário: datas para dia inteiro, instantes para horário

- **Status:** aceito
- **Data:** 2026-10-23

## Contexto

O calendário mostra eventos criados no DevDesk e os prazos das milestones do GitHub. Calendário é onde mora a maior parte dos bugs de fuso: o evento "do dia 24" que aparece no dia 23, o compromisso das 23h30 que pula para o dia seguinte, a semana que perde um dia na virada do horário de verão.

## Decisão

- **Dois formatos, nunca misturados.** Evento de dia inteiro é uma data de calendário (`2026-10-24`), sem fuso. Evento com horário é um instante em UTC. O contrato em `@devdesk/shared` é uma união discriminada por `allDay`, e uma restrição `CHECK` garante o mesmo no banco.
- **Fuso de quem olha.** A API não sabe o fuso do navegador. Para eventos com horário, ela devolve uma folga de um dia de cada lado do intervalo pedido, e o front decide o dia local de cada evento.
- **Contas com datas ao meio-dia local.** No front, uma data vira um `Date` às 12h do dia, longe da meia-noite, para somar dias sem cair num dia errado quando o horário de verão muda.
- **Prazos separados dos eventos.** Eventos vêm do banco e respondem em milissegundos; prazos dependem do GitHub. Cada um tem a sua rota, para o calendário abrir na hora mesmo com o GitHub lento ou fora do ar.
- **Edição por substituição (`PUT`).** O horário é uma escolha entre dois formatos, não um campo que se altera sozinho, então o evento é enviado inteiro.
- **Lembretes dentro da página.** Um aviso aparece na hora do lembrete enquanto o DevDesk está aberto. Notificações do sistema exigiriam permissão e um service worker, e ficam para depois.

## Consequências

- Um evento de dia inteiro aparece no mesmo dia em qualquer fuso, que é o que se espera de um feriado ou de um prazo.
- O `.ics` exportado é uma foto do momento. Uma assinatura que atualiza sozinha (URL com token) exigiria um token de longa duração na URL, e foi deixada de fora de propósito.
- O prazo de uma milestone usa a data em UTC que o GitHub devolve, o que bate com o que a interface do GitHub mostra.
- Eventos que se repetem (toda segunda, por exemplo) ainda não existem.
