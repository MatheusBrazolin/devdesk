// Visual único (Quadro, escuro): a classe vai antes do primeiro paint, para não piscar.
// Arquivo à parte (e não inline) porque a política de conteúdo da produção só aceita scripts próprios.
document.documentElement.classList.add('dark')
