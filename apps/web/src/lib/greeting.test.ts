import { describe, expect, it } from 'vitest'
import { firstName, greetingFor, initials } from './greeting'

const at = (hour: number) => new Date(2026, 9, 23, hour, 30)

describe('greetingFor', () => {
  it.each([
    [5, 'Bom dia'],
    [11, 'Bom dia'],
    [12, 'Boa tarde'],
    [17, 'Boa tarde'],
    [18, 'Boa noite'],
    [2, 'Boa noite'],
  ])('às %ih diz "%s"', (hour, expected) => {
    expect(greetingFor(at(hour))).toBe(expected)
  })
})

describe('firstName', () => {
  it('pega o primeiro nome', () => expect(firstName('Matheus Brazolin', 'mb')).toBe('Matheus'))
  it('cai no login quando não há nome', () => expect(firstName(null, 'octocat')).toBe('octocat'))
  it('ignora nome em branco', () => expect(firstName('   ', 'octocat')).toBe('octocat'))
})

describe('initials', () => {
  it('usa primeiro e último nome', () => expect(initials('Ana Maria Souza', 'x')).toBe('AS'))
  it('usa duas letras do login', () => expect(initials(null, 'octocat')).toBe('OC'))
})
