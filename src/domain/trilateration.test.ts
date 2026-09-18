import { describe, expect, it } from 'vitest'
import { circleIntersections, pickByThirdStation } from './trilateration'

function sortByY(points: { x: number; y: number }[]) {
  return [...points].sort((a, b) => a.y - b.y)
}

describe('circleIntersections', () => {
  it('zwraca dwa punkty lustrzane dla klasycznego trójkąta 500/800', () => {
    const r = Math.hypot(500, 800)
    const result = sortByY(circleIntersections({ x: 0, y: 0 }, r, { x: 1000, y: 0 }, r))
    expect(result).toHaveLength(2)
    expect(result[0].x).toBeCloseTo(500, 6)
    expect(result[0].y).toBeCloseTo(-800, 6)
    expect(result[1].x).toBeCloseTo(500, 6)
    expect(result[1].y).toBeCloseTo(800, 6)
  })

  it('punkt styczny na osi bazy daje jeden wynik', () => {
    // S1=(0,0) r1=600, S2=(1000,0) r2=400 -> punkt styczny w (600,0)
    const result = circleIntersections({ x: 0, y: 0 }, 600, { x: 1000, y: 0 }, 400)
    expect(result).toHaveLength(1)
    expect(result[0].x).toBeCloseTo(600, 6)
    expect(result[0].y).toBeCloseTo(0, 6)
  })

  it('okręgi rozłączne (za daleko) nie mają przecięcia', () => {
    const result = circleIntersections({ x: 0, y: 0 }, 100, { x: 1000, y: 0 }, 100)
    expect(result).toEqual([])
  })

  it('jeden okrąg wewnątrz drugiego nie ma przecięcia', () => {
    const result = circleIntersections({ x: 0, y: 0 }, 1000, { x: 10, y: 0 }, 50)
    expect(result).toEqual([])
  })

  it('stanowiska w tym samym miejscu są nieprawidłową konfiguracją', () => {
    const result = circleIntersections({ x: 100, y: 100 }, 500, { x: 100, y: 100 }, 500)
    expect(result).toEqual([])
  })

  it('trzecie stanowisko poprawnie wybiera stronę', () => {
    const r = Math.hypot(500, 800)
    const candidates = circleIntersections({ x: 0, y: 0 }, r, { x: 1000, y: 0 }, r)
    // S3 blisko kandydata (500, 800) - promień dopasowany do tej strony
    const s3 = { x: 1200, y: 800 }
    const r3 = Math.hypot(1200 - 500, 0)
    const picked = pickByThirdStation(candidates, s3, r3)
    expect(picked).not.toBeNull()
    expect(picked!.point.y).toBeCloseTo(800, 3)
    expect(picked!.residualMm).toBeLessThan(1)
  })
})
