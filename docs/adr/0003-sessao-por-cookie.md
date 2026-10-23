# 0003. Sessão por cookie opaco, não JWT

- **Status:** aceito
- **Data:** 2026-10-23

## Contexto

O login é pelo GitHub, mas a aplicação precisa da própria sessão. As opções eram um JWT assinado ou um token opaco guardado no banco.

## Decisão

Token opaco aleatório (256 bits) num cookie `httpOnly`, `SameSite=Lax`. O banco guarda só o SHA-256 dele, com data de expiração. Front e API ficam na mesma origem.

## Consequências

- Logout e revogação são imediatos: basta apagar a linha.
- O JavaScript da página nunca enxerga o token, o que reduz o estrago de um XSS.
- Cada requisição autenticada faz uma consulta ao banco. No volume esperado isso é irrelevante, e um cache resolve se deixar de ser.
