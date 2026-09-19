import { describe, expect, it } from 'vitest'
import { resolveInstrumentPositions, resolveTarget, targetStatus } from './survey'
import type { StationSurvey } from './model'

function makeSurvey(overrides: Partial<StationSurvey> = {}): StationSurvey {
  return {
    id: 'SV1', name: 'test', plane: 'xy',
    targets: [], instrumentPositions: [], baselines: [], observations: [], sketchEdges: [],
    ...overrides
  }
}

describe('resolveInstrumentPositions', () => {
  it('D1 w (0,0), D2 wzdluz kierunku ze szkicu na odleglosc bazy', () => {
    const survey = makeSurvey({
      instrumentPositions: [
        { id: 'D1', label: 'D1', sketch: { x: 0, y: 0 } },
        { id: 'D2', label: 'D2', sketch: { x: 1, y: 0 } }
      ],
      baselines: [{ fromInstrumentId: 'D1', toInstrumentId: 'D2', distanceMm: 3000 }]
    })
    const resolved = resolveInstrumentPositions(survey)
    expect(resolved.get('D1')).toEqual({ x: 0, y: 0, z: 0 })
    expect(resolved.get('D2')!.x).toBeCloseTo(3000, 3)
    expect(resolved.get('D2')!.y).toBeCloseTo(0, 3)
  })
})

describe('resolveTarget', () => {
  const baseSurvey = makeSurvey({
    instrumentPositions: [
      { id: 'D1', label: 'D1', sketch: { x: 0, y: 0 } },
      { id: 'D2', label: 'D2', sketch: { x: 1, y: 0 } },
      { id: 'D3', label: 'D3', sketch: { x: 0.3, y: -0.4 } } // kierunek 0.6/-0.8 -> real (1500,-2000) przy bazie 2500 mm
    ],
    baselines: [
      { fromInstrumentId: 'D1', toInstrumentId: 'D2', distanceMm: 3000 },
      { fromInstrumentId: 'D1', toInstrumentId: 'D3', distanceMm: 2500 }
    ]
  })
  const resolved = resolveInstrumentPositions(baseSurvey)

  it('brak odczytow -> none', () => {
    const target = { id: 'P1', label: 'P1', sketch: { x: 0.3, y: 1 }, order: 0 }
    expect(resolveTarget(target, baseSurvey, resolved)).toEqual({ kind: 'none' })
  })

  it('jeden odczyt -> insufficient', () => {
    const target = { id: 'P1', label: 'P1', sketch: { x: 0.3, y: 1 }, order: 0 }
    const survey = { ...baseSurvey, observations: [{ id: 'o1', instrumentPositionId: 'D1', targetId: 'P1', distanceMm: 1803, source: 'manual' as const, createdAt: '' }] }
    expect(resolveTarget(target, survey, resolved).kind).toBe('insufficient')
  })

  it('dwa odczyty + szkic po dodatniej stronie wybiera zgodnego kandydata', () => {
    // Rzeczywiste kandydaci dla D1=(0,0) r=1803, D2=(3000,0) r=2500 to ok. (1000,1500) i (1000,-1500)
    const target = { id: 'P1', label: 'P1', sketch: { x: 0.33, y: 1 }, order: 0 } // szkicowo "nad" D1-D2
    const survey = {
      ...baseSurvey,
      observations: [
        { id: 'o1', instrumentPositionId: 'D1', targetId: 'P1', distanceMm: 1803, source: 'manual' as const, createdAt: '' },
        { id: 'o2', instrumentPositionId: 'D2', targetId: 'P1', distanceMm: 2500, source: 'manual' as const, createdAt: '' }
      ]
    }
    const result = resolveTarget(target, survey, resolved)
    expect(result.kind).toBe('sketch-picked')
    if (result.kind === 'sketch-picked') {
      expect(result.point.y).toBeGreaterThan(0)
      expect(result.point.x).toBeCloseTo(1000, 0)
    }
  })

  it('trzeci odczyt rozstrzyga ostatecznie i liczy residuum', () => {
    const target = { id: 'P1', label: 'P1', sketch: { x: 0.33, y: 1 }, order: 0 }
    const survey = {
      ...baseSurvey,
      observations: [
        { id: 'o1', instrumentPositionId: 'D1', targetId: 'P1', distanceMm: 1803, source: 'manual' as const, createdAt: '' },
        { id: 'o2', instrumentPositionId: 'D2', targetId: 'P1', distanceMm: 2500, source: 'manual' as const, createdAt: '' },
        { id: 'o3', instrumentPositionId: 'D3', targetId: 'P1', distanceMm: 3536, source: 'manual' as const, createdAt: '' }
      ]
    }
    const result = resolveTarget(target, survey, resolved)
    expect(result.kind).toBe('resolved3')
    if (result.kind === 'resolved3') {
      expect(result.point.y).toBeGreaterThan(0)
      expect(result.residualMm).toBeLessThan(5)
      expect(targetStatus(result)).toBe('done')
    }
  })

  it('najnowszy odczyt per pozycja nadpisuje wczesniejszy w rozwiazaniu (historia zostaje osobno)', () => {
    const target = { id: 'P1', label: 'P1', sketch: { x: 0.33, y: 1 }, order: 0 }
    const survey = {
      ...baseSurvey,
      observations: [
        { id: 'o1', instrumentPositionId: 'D1', targetId: 'P1', distanceMm: 999, source: 'manual' as const, createdAt: '' },
        { id: 'o2', instrumentPositionId: 'D1', targetId: 'P1', distanceMm: 1803, source: 'manual' as const, createdAt: '' },
        { id: 'o3', instrumentPositionId: 'D2', targetId: 'P1', distanceMm: 2500, source: 'manual' as const, createdAt: '' }
      ]
    }
    expect(survey.observations).toHaveLength(3)
    const result = resolveTarget(target, survey, resolved)
    expect(result.kind).toBe('sketch-picked')
    if (result.kind === 'sketch-picked') expect(result.point.x).toBeCloseTo(1000, 0)
  })
})
