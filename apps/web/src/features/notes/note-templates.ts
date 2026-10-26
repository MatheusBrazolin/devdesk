import type { CreateNoteInput } from '@devdesk/shared'

/** Modelos de nota para começar com estrutura, em vez da página em branco. */
export interface NoteTemplate {
  id: string
  label: string
  description: string
  note: CreateNoteInput
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'review',
    label: 'Checklist de review',
    description: 'o que olhar antes de aprovar',
    note: {
      title: 'Review de PR',
      tags: ['review'],
      body: [
        '## Contexto',
        '- [ ] Entendi o problema que o PR resolve',
        '- [ ] A descrição explica o porquê, não só o quê',
        '',
        '## Código',
        '- [ ] Nomes claros e funções pequenas',
        '- [ ] Erros tratados (rede, entrada inválida, vazio)',
        '- [ ] Sem segredo, log sensível ou TODO esquecido',
        '',
        '## Testes',
        '- [ ] Cobrem o caso feliz e os de borda',
        '- [ ] Rodei localmente ou o CI passou',
        '',
        '## Comentários para o autor',
        '- ',
      ].join('\n'),
    },
  },
  {
    id: 'deploy',
    label: 'Checklist de deploy',
    description: 'antes, durante e depois de subir',
    note: {
      title: 'Deploy',
      tags: ['deploy'],
      body: [
        '## Antes',
        '- [ ] PRs do release mergeados e CI verde',
        '- [ ] Migrações revisadas (e reversíveis)',
        '- [ ] Time avisado do horário',
        '',
        '## Durante',
        '- [ ] Deploy iniciado',
        '- [ ] Healthcheck respondendo',
        '',
        '## Depois',
        '- [ ] Erros e latência normais por 30 min',
        '- [ ] Changelog atualizado',
        '',
        '## Como voltar atrás',
        '- ',
      ].join('\n'),
    },
  },
  {
    id: 'um-a-um',
    label: 'Pauta de 1:1',
    description: 'conversa com a liderança',
    note: {
      title: 'Pauta de 1:1',
      tags: ['1:1'],
      body: [
        '## O que fiz desde a última',
        '- ',
        '',
        '## Onde estou travado',
        '- ',
        '',
        '## Quero conversar sobre',
        '- ',
        '',
        '## Combinados',
        '- [ ] ',
      ].join('\n'),
    },
  },
  {
    id: 'bug',
    label: 'Investigação de bug',
    description: 'sintoma, hipóteses e causa',
    note: {
      title: 'Investigação de bug',
      tags: ['bug'],
      body: [
        '## Sintoma',
        '',
        '## Como reproduzir',
        '1. ',
        '',
        '## Hipóteses',
        '- [ ] ',
        '',
        '## Causa e correção',
        '',
      ].join('\n'),
    },
  },
]
