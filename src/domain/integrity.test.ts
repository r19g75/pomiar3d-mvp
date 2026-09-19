import { describe, expect, it } from 'vitest'
import { nextElementId } from './model'
import { checkPointIntegrity, renamePointLabel, repairDuplicateLabels, setPointAsOrigin } from './integrity'
import type { Area, Point3D } from './model'

function pt(id: string, label?: string): Point3D {
  return { id, label, position: { x: 0, y: 0, z: 0 }, source: 'measured', state: 'existing' }
}

function makeArea(points: Point3D[]): Area {
  return {
    id: 'A1', name: 'test', kind: 'room', createdAt: '', updatedAt: '',
    points, walls: [], shapes: [], sections: [], measurements: [], sessions: [], history: []
  }
}

describe('nextElementId - numeracja z lukami (pkt 5, 11 A/B/C)', () => {
  it('A: brak punktow -> P0', () => {
    expect(nextElementId([], 'P')).toBe('P0')
  })
  it('B: P0,P2,P3 -> P1', () => {
    expect(nextElementId(['P0', 'P2', 'P3'], 'P')).toBe('P1')
  })
  it('C: P0,P1,P2,P4 -> P3', () => {
    expect(nextElementId(['P0', 'P1', 'P2', 'P4'], 'P')).toBe('P3')
  })
})

describe('renamePointLabel (pkt 6, D, E)', () => {
  it('D: P5 juz istnieje -> blad, nie nadaje etykiety', () => {
    const area = makeArea([pt('p1', 'P5'), pt('p2', 'P3')])
    const result = renamePointLabel(area, 'p2', 'P5')
    expect('error' in result).toBe(true)
  })
  it('E: zmiana P3 -> P1 (wolne) dziala, id niezmienne', () => {
    const area = makeArea([pt('p1', 'P3')])
    const result = renamePointLabel(area, 'p1', 'P1')
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.points[0].id).toBe('p1')
      expect(result.points[0].label).toBe('P1')
    }
  })
})

describe('setPointAsOrigin (pkt 7)', () => {
  it('zamienia etykiety, nigdy nie tworzy dwoch P0', () => {
    const area = makeArea([pt('p0', 'P0'), pt('p3', 'P3')])
    const next = setPointAsOrigin(area, 'p3')
    const labels = next.points.map((p) => p.label)
    expect(labels.filter((l) => l === 'P0')).toHaveLength(1)
    expect(next.points.find((p) => p.id === 'p3')!.label).toBe('P0')
    expect(next.points.find((p) => p.id === 'p0')!.label).toBe('P3')
  })
})

describe('checkPointIntegrity / repairDuplicateLabels (pkt 4, 10, H)', () => {
  it('H: dwa punkty P5 - wykrywa konflikt, naprawa nadaje wolna etykiete bez utraty danych', () => {
    const area = makeArea([pt('a', 'P5'), pt('b', 'P5')])
    const issues = checkPointIntegrity(area)
    expect(issues.some((i) => i.kind === 'duplicate-label')).toBe(true)

    const repaired = repairDuplicateLabels(area)
    const labels = repaired.points.map((p) => p.label)
    expect(new Set(labels).size).toBe(2)
    expect(repaired.points).toHaveLength(2)
    expect(repaired.points.find((p) => p.id === 'a')!.label).toBe('P5')
  })

  it('wykrywa wiszace referencje sciany do nieistniejacego punktu', () => {
    const area = { ...makeArea([pt('p0', 'P0')]), walls: [{ id: 'W0', from: 'p0', to: 'ghost', heightMm: 0, thicknessMm: 0, status: 'incomplete' as const }] }
    const issues = checkPointIntegrity(area)
    expect(issues.some((i) => i.kind === 'dangling-reference')).toBe(true)
  })
})
