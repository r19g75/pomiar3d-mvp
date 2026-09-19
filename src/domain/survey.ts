import type { StationSurvey, SurveyInstrumentPosition, SurveyTarget } from './model'
import { circleIntersections, pickByThirdStation, type Vec2 } from './trilateration'

export const RESIDUAL_WARN_MM = 50

export type ResolvedInstruments = Map<string, { x: number; y: number; z: number }>

/** D1 = poczatek lokalnego ukladu; kolejne pozycje wyliczane z baseline + kierunku ze szkicu. */
export function resolveInstrumentPositions(survey: StationSurvey): ResolvedInstruments {
  const resolved: ResolvedInstruments = new Map()
  if (survey.instrumentPositions.length === 0) return resolved
  resolved.set(survey.instrumentPositions[0].id, { x: 0, y: 0, z: 0 })

  let changed = true
  while (changed) {
    changed = false
    for (const b of survey.baselines) {
      const from = resolved.get(b.fromInstrumentId)
      const to = resolved.get(b.toInstrumentId)
      const fromInst = survey.instrumentPositions.find((p) => p.id === b.fromInstrumentId)
      const toInst = survey.instrumentPositions.find((p) => p.id === b.toInstrumentId)
      if (from && !to && fromInst && toInst) {
        const dx = toInst.sketch.x - fromInst.sketch.x
        const dy = toInst.sketch.y - fromInst.sketch.y
        const len = Math.hypot(dx, dy) || 1
        resolved.set(b.toInstrumentId, { x: from.x + (dx / len) * b.distanceMm, y: from.y + (dy / len) * b.distanceMm, z: 0 })
        changed = true
      } else if (to && !from && fromInst && toInst) {
        const dx = fromInst.sketch.x - toInst.sketch.x
        const dy = fromInst.sketch.y - toInst.sketch.y
        const len = Math.hypot(dx, dy) || 1
        resolved.set(b.fromInstrumentId, { x: to.x + (dx / len) * b.distanceMm, y: to.y + (dy / len) * b.distanceMm, z: 0 })
        changed = true
      }
    }
  }
  return resolved
}

export type TargetResolution =
  | { kind: 'none' }
  | { kind: 'insufficient' }
  | { kind: 'unique'; point: Vec2 }
  | { kind: 'sketch-picked'; point: Vec2 }
  | { kind: 'ambiguous'; points: [Vec2, Vec2] }
  | { kind: 'resolved3'; point: Vec2; residualMm: number }

function sign(cross: number) { return cross > 0 ? 1 : cross < 0 ? -1 : 0 }

/**
 * Rozwiazuje pozycje targetu z odczytow (najnowszy per pozycja dalmierza).
 * Przy dwoch kandydatach probuje wybrac strone na podstawie znaku po szkicu,
 * a jesli jest trzeci odczyt - rozstrzyga nim ostatecznie (residuum).
 */
export function resolveTarget(target: SurveyTarget, survey: StationSurvey, resolvedInstruments: ResolvedInstruments): TargetResolution {
  const latestByInstrument = new Map<string, number>()
  for (const o of survey.observations) if (o.targetId === target.id) latestByInstrument.set(o.instrumentPositionId, o.distanceMm)

  const entries = Array.from(latestByInstrument.entries())
    .map(([instId, distanceMm]) => ({ inst: survey.instrumentPositions.find((p) => p.id === instId), pos: resolvedInstruments.get(instId), distanceMm }))
    .filter((e): e is { inst: SurveyInstrumentPosition; pos: { x: number; y: number; z: number }; distanceMm: number } => !!e.inst && !!e.pos)

  if (entries.length === 0) return { kind: 'none' }
  if (entries.length < 2) return { kind: 'insufficient' }

  const [a, b, c] = entries
  const candidates = circleIntersections({ x: a.pos.x, y: a.pos.y }, a.distanceMm, { x: b.pos.x, y: b.pos.y }, b.distanceMm)
  if (candidates.length === 0) return { kind: 'none' }
  if (candidates.length === 1) return { kind: 'unique', point: candidates[0] }

  if (c) {
    const picked = pickByThirdStation(candidates, { x: c.pos.x, y: c.pos.y }, c.distanceMm)
    if (picked) return { kind: 'resolved3', point: picked.point, residualMm: picked.residualMm }
  }

  const skA = a.inst.sketch; const skB = b.inst.sketch; const skP = target.sketch
  const sketchSign = sign((skB.x - skA.x) * (skP.y - skA.y) - (skB.y - skA.y) * (skP.x - skA.x))
  if (sketchSign !== 0) {
    const realSign0 = sign((b.pos.x - a.pos.x) * (candidates[0].y - a.pos.y) - (b.pos.y - a.pos.y) * (candidates[0].x - a.pos.x))
    return { kind: 'sketch-picked', point: realSign0 === sketchSign ? candidates[0] : candidates[1] }
  }

  return { kind: 'ambiguous', points: [candidates[0], candidates[1]] }
}

export type TargetStatus = 'none' | 'partial' | 'done' | 'warn'

export function targetStatus(resolution: TargetResolution): TargetStatus {
  switch (resolution.kind) {
    case 'none': return 'none'
    case 'insufficient': return 'partial'
    case 'ambiguous': return 'warn'
    case 'resolved3': return resolution.residualMm > RESIDUAL_WARN_MM ? 'warn' : 'done'
    default: return 'done'
  }
}
