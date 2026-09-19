import { describe, expect, it } from 'vitest'
import { removeArea, setAreaArchived } from './operations'
import { isArchived, makeEmptyArea, type Project } from './model'

function makeProject(areas: Project['areas']): Project {
  return { format: 'pomiar3d', version: 1, id: 'PR1', name: 'test', units: 'mm', createdAt: '', updatedAt: '', activeAreaId: areas[0]?.id, areas }
}

describe('setAreaArchived (pkt 1, A)', () => {
  it('archiwizuje i przywraca obszar bez ruszania innych', () => {
    const a1 = makeEmptyArea('Pokój'); const a2 = makeEmptyArea('Taras')
    let project = makeProject([a1, a2])

    project = setAreaArchived(project, a1.id, true)
    expect(isArchived(project.areas[0])).toBe(true)
    expect(isArchived(project.areas[1])).toBe(false)

    project = setAreaArchived(project, a1.id, false)
    expect(isArchived(project.areas[0])).toBe(false)
  })

  it('brak pola archived traktowany jako false (stare dane)', () => {
    const a1 = makeEmptyArea('Pokój')
    expect(isArchived(a1)).toBe(false)
  })
})

describe('removeArea (pkt 1, B)', () => {
  it('usuwa tylko wybrany obszar, nie rusza pozostałych', () => {
    const a1 = makeEmptyArea('Pokój'); const a2 = makeEmptyArea('Taras')
    const project = makeProject([a1, a2])
    const next = removeArea(project, a1.id)
    expect(next.areas).toHaveLength(1)
    expect(next.areas[0].id).toBe(a2.id)
  })

  it('przełącza activeAreaId gdy usunięto aktywny obszar', () => {
    const a1 = makeEmptyArea('Pokój'); const a2 = makeEmptyArea('Taras')
    const project = makeProject([a1, a2])
    const next = removeArea(project, a1.id)
    expect(next.activeAreaId).toBe(a2.id)
  })
})
