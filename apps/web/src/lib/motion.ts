/** Entrada padrão dos blocos de uma página: sobem e aparecem, em sequência. */
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: [0.2, 0.9, 0.3, 1] as const },
})
