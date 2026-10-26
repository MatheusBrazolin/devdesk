/** Pedidos para abrir o tour de primeiros passos (menu do usuário). */

const listeners = new Set<() => void>()
/** Quantas vezes o tour foi pedido: cada pedido novo abre de novo. */
let requests = 0

export function openWelcomeTour() {
  requests += 1
  listeners.forEach((listener) => listener())
}

export const requestCount = () => requests

export function subscribeWelcome(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
