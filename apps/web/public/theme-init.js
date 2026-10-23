// Aplica o tema antes do primeiro paint, para não piscar. Arquivo à parte (e
// não inline) porque a política de conteúdo da produção só aceita scripts próprios.
try {
  const saved = localStorage.getItem('devdesk:theme') ?? 'system'
  const dark =
    saved === 'dark' || (saved === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
} catch {
  // Sem armazenamento: o React aplica o tema logo em seguida.
}
