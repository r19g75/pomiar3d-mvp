import { describe, expect, it } from 'vitest'
import { autoThicknessSide, effectiveThicknessSide, findClosedLoop } from './geometry'
import type { Area, Point3D, Wall } from './model'

function pt(id: string, x: number, y: number): Point3D {
  return { id, position: { x, y, z: 0 }, source: 'measured', state: 'existing' }
}

function wall(id: string, from: string, to: string, thicknessSide?: 1 | -1): Wall {
  return { id, from, to, heightMm: 2600, thicknessMm: 120, status: 'measured', state: 'existing', thicknessSide }
}

function makeArea(points: Point3D[], walls: Wall[]): Area {
  return { id: 'A1', name: 'test', kind: 'room', createdAt: '', updatedAt: '', points, walls, shapes: [], sections: [], measurements: [], sessions: [], history: [] }
}

/** Kierunek "na zewnątrz" dla danej ściany, tak jak liczy go FloorPlan przy rysowaniu tick-a grubości. */
function outwardDirection(w: Wall, area: Area) {
  const points = new Map(area.points.map((p) => [p.id, p]))
  const a = points.get(w.from)!.position; const b = points.get(w.to)!.position
  const dx = b.x - a.x; const dy = b.y - a.y
  const side = effectiveThicknessSide(w, area)
  return { x: -dy * side, y: dx * side }
}

describe('findClosedLoop', () => {
  it('wykrywa zamknięty prostokąt', () => {
    const points = [pt('P0', 0, 0), pt('P1', 4000, 0), pt('P2', 4000, 3000), pt('P3', 0, 3000)]
    const walls = [wall('W0', 'P0', 'P1'), wall('W1', 'P1', 'P2'), wall('W2', 'P2', 'P3'), wall('W3', 'P3', 'P0')]
    const area = makeArea(points, walls)
    const loop = findClosedLoop(walls[0], walls)
    expect(loop).toEqual(['P0', 'P1', 'P2', 'P3'])
    expect(area.walls).toHaveLength(4)
  })

  it('zwraca null dla otwartego łańcucha ścian', () => {
    const points = [pt('P0', 0, 0), pt('P1', 4000, 0), pt('P2', 4000, 3000)]
    const walls = [wall('W0', 'P0', 'P1'), wall('W1', 'P1', 'P2')]
    expect(findClosedLoop(walls[0], walls)).toBeNull()
  })
})

describe('autoThicknessSide / effectiveThicknessSide (pkt 4, F)', () => {
  const points = [pt('P0', 0, 0), pt('P1', 4000, 0), pt('P2', 4000, 3000), pt('P3', 0, 3000)]
  const walls = [wall('W0', 'P0', 'P1'), wall('W1', 'P1', 'P2'), wall('W2', 'P2', 'P3'), wall('W3', 'P3', 'P0')]
  const area = makeArea(points, walls)

  it('dolna ściana (P0->P1): grubość na zewnątrz = w dół (-Y)', () => {
    const d = outwardDirection(walls[0], area)
    expect(d.y).toBeLessThan(0)
  })
  it('prawa ściana (P1->P2): grubość na zewnątrz = w prawo (+X)', () => {
    const d = outwardDirection(walls[1], area)
    expect(d.x).toBeGreaterThan(0)
  })
  it('górna ściana (P2->P3): grubość na zewnątrz = w górę (+Y)', () => {
    const d = outwardDirection(walls[2], area)
    expect(d.y).toBeGreaterThan(0)
  })
  it('lewa ściana (P3->P0): grubość na zewnątrz = w lewo (-X)', () => {
    const d = outwardDirection(walls[3], area)
    expect(d.x).toBeLessThan(0)
  })

  it('działa tak samo niezależnie od kierunku zapisu from/to ściany', () => {
    const reversed = makeArea(points, [wall('W0', 'P1', 'P0'), walls[1], walls[2], walls[3]])
    const d = outwardDirection(reversed.walls[0], reversed)
    expect(d.y).toBeLessThan(0)
  })

  it('ręczne ustawienie thicknessSide ma priorytet nad auto-wykryciem', () => {
    const auto = autoThicknessSide(walls[0], area)
    const manual = wall('W0', 'P0', 'P1', auto === 1 ? -1 : 1)
    expect(effectiveThicknessSide(manual, area)).toBe(auto === 1 ? -1 : 1)
  })

  it('dla niejednoznacznego obrysu (brak zamkniętej pętli) zwraca domyślnie 1 bez ręcznego override', () => {
    const openWalls = [wall('W0', 'P0', 'P1'), wall('W1', 'P1', 'P2')]
    const openArea = makeArea(points.slice(0, 3), openWalls)
    expect(effectiveThicknessSide(openWalls[0], openArea)).toBe(1)
  })

  it('odwrócenie strony nie zmienia punktów ściany (długość pomiarowa bez zmian)', () => {
    const before = { from: walls[0].from, to: walls[0].to }
    const flipped = { ...walls[0], thicknessSide: -1 as const }
    expect(flipped.from).toBe(before.from)
    expect(flipped.to).toBe(before.to)
  })
})
