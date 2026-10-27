import type { CreateNoteInput } from '@devdesk/shared'
import { t } from '@/lib/i18n'

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
    label: t('Checklist de review'),
    description: t('o que olhar antes de aprovar'),
    note: {
      title: t('Review de PR'),
      tags: ['review'],
      body: [
        t('## Contexto'),
        t('- [ ] Entendi o problema que o PR resolve'),
        t('- [ ] A descrição explica o porquê, não só o quê'),
        '',
        t('## Código'),
        t('- [ ] Nomes claros e funções pequenas'),
        t('- [ ] Erros tratados (rede, entrada inválida, vazio)'),
        t('- [ ] Sem segredo, log sensível ou TODO esquecido'),
        '',
        t('## Testes'),
        t('- [ ] Cobrem o caso feliz e os de borda'),
        t('- [ ] Rodei localmente ou o CI passou'),
        '',
        t('## Comentários para o autor'),
        '- ',
      ].join('\n'),
    },
  },
  {
    id: 'deploy',
    label: t('Checklist de deploy'),
    description: t('antes, durante e depois de subir'),
    note: {
      title: t('Deploy'),
      tags: ['deploy'],
      body: [
        t('## Antes'),
        t('- [ ] PRs do release mergeados e CI verde'),
        t('- [ ] Migrações revisadas (e reversíveis)'),
        t('- [ ] Time avisado do horário'),
        '',
        t('## Durante'),
        t('- [ ] Deploy iniciado'),
        t('- [ ] Healthcheck respondendo'),
        '',
        t('## Depois'),
        t('- [ ] Erros e latência normais por 30 min'),
        t('- [ ] Changelog atualizado'),
        '',
        t('## Como voltar atrás'),
        '- ',
      ].join('\n'),
    },
  },
  {
    id: 'um-a-um',
    label: t('Pauta de 1:1'),
    description: t('conversa com a liderança'),
    note: {
      title: t('Pauta de 1:1'),
      tags: ['1:1'],
      body: [
        t('## O que fiz desde a última'),
        '- ',
        '',
        t('## Onde estou travado'),
        '- ',
        '',
        t('## Quero conversar sobre'),
        '- ',
        '',
        t('## Combinados'),
        '- [ ] ',
      ].join('\n'),
    },
  },
  {
    id: 'bug',
    label: t('Investigação de bug'),
    description: t('sintoma, hipóteses e causa'),
    note: {
      title: t('Investigação de bug'),
      tags: ['bug'],
      body: [
        t('## Sintoma'),
        '',
        t('## Como reproduzir'),
        '1. ',
        '',
        t('## Hipóteses'),
        '- [ ] ',
        '',
        t('## Causa e correção'),
        '',
      ].join('\n'),
    },
  },
]
