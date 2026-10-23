import { describe, expect, it } from 'vitest'
import type { WorkSnapshot } from '../../domain/work.js'
import { InMemorySnapshotCache } from './in-memory-snapshot-cache.js'
import { LayeredSnapshotCache } from './postgres-snapshot-cache.js'
import { decodeSnapshot, encodeSnapshot, SNAPSHOT_VERSION } from './snapshot-codec.js'

const snapshot: WorkSnapshot = {
  fetchedAt: new Date('2026-10-23T12:00:00Z'),
  isSample: false,
  reviewRequested: [],
  authored: [
    {
      id: 'PR_1',
      number: 1,
      title: 'x',
      url: 'https://github.com/a/b/pull/1',
      repository: 'a/b',
      author: null,
      isDraft: false,
      createdAt: new Date('2026-10-20T10:00:00Z'),
      updatedAt: new Date('2026-10-22T10:00:00Z'),
      mergedAt: null,
      ciStatus: 'success',
      reviewDecision: null,
      mergeable: 'mergeable',
      approvals: 1,
      comments: 0,
      milestone: null,
    },
  ],
  merged: [],
  issues: [
    {
      id: 'I_1',
      number: 2,
      title: 'y',
      url: 'https://github.com/a/b/issues/2',
      repository: 'a/b',
      author: null,
      createdAt: new Date('2026-10-20T10:00:00Z'),
      updatedAt: new Date('2026-10-21T10:00:00Z'),
      labels: [],
      comments: 0,
      milestone: {
        title: 'Sprint',
        dueOn: '2026-10-31',
        url: 'https://github.com/a/b/milestone/1',
      },
    },
  ],
  totals: { reviewRequested: 0, authored: 1, merged: 0, issues: 1 },
}

describe('snapshot-codec', () => {
  it('volta idêntico, com as datas como Date', () => {
    const stored = JSON.parse(JSON.stringify(encodeSnapshot(snapshot)))
    const decoded = decodeSnapshot(stored)
    expect(decoded).toEqual(snapshot)
    expect(decoded?.authored[0]?.updatedAt).toBeInstanceOf(Date)
  })

  it('retrato de outra versão do formato é ignorado', () => {
    const stored = { ...encodeSnapshot(snapshot), version: SNAPSHOT_VERSION + 1 }
    expect(decodeSnapshot(stored)).toBeUndefined()
  })

  it('retrato corrompido é ignorado, sem derrubar o painel', () => {
    expect(
      decodeSnapshot({ version: SNAPSHOT_VERSION, snapshot: { fetchedAt: 'ontem' } }),
    ).toBeUndefined()
    expect(decodeSnapshot('lixo')).toBeUndefined()
  })
})

describe('LayeredSnapshotCache', () => {
  it('lê do persistente quando a memória está vazia (API reiniciada) e aquece a memória', async () => {
    const memory = new InMemorySnapshotCache()
    const persistent = new InMemorySnapshotCache()
    await persistent.set('u', 'tok', snapshot)

    const layered = new LayeredSnapshotCache(memory, persistent)
    await expect(layered.get('u', 'tok')).resolves.toEqual(snapshot)
    await expect(memory.get('u', 'tok')).resolves.toEqual(snapshot)
  })

  it('grava nas duas camadas', async () => {
    const memory = new InMemorySnapshotCache()
    const persistent = new InMemorySnapshotCache()
    await new LayeredSnapshotCache(memory, persistent).set('u', 'tok', snapshot)
    await expect(memory.get('u', 'tok')).resolves.toBeDefined()
    await expect(persistent.get('u', 'tok')).resolves.toBeDefined()
  })

  it('outra credencial não recebe o retrato', async () => {
    const layered = new LayeredSnapshotCache(
      new InMemorySnapshotCache(),
      new InMemorySnapshotCache(),
    )
    await layered.set('u', 'tok', snapshot)
    await expect(layered.get('u', 'outro')).resolves.toBeUndefined()
  })
})
