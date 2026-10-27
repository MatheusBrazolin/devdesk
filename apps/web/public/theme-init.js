// Visual único (Quadro, escuro): a classe vai antes do primeiro paint, para não piscar.
// Arquivo à parte (e não inline) porque a política de conteúdo da produção só aceita scripts próprios.
document.documentElement.classList.add('dark')

// Troca de idioma: a página volta esmaecendo, em vez de aparecer de uma vez.
try {
  if (sessionStorage.getItem('devdesk:troca-idioma')) {
    sessionStorage.removeItem('devdesk:troca-idioma')
    document.documentElement.classList.add('lang-entering')
  }
} catch {
  // Sem armazenamento: entra direto.
}
