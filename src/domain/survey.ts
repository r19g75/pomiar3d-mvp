import type { Area, StationSurvey, SurveyInstrumentPosition, SurveyTarget } from './model'
import { labelOf } from './model'
import { circleBestFit, circleIntersections, pickByThirdStation, type Vec2 } from './trilateration'

export const RESIDUAL_WARN_MM = 50

export type ResolvedInstruments = Map<string, { x: number; y: number; z: number }>

/** Zwraca zapisaną bazę między dwiema pozycjami dalmierza niezależnie od kierunku zapisu. */
export function baselineBetween(survey: StationSurvey, aId: string, bId: string): number | undefined {
  const b = survey.baselines.find((x) => (x.fromInstrumentId === aId && x.toInstrumentId === bId) || (x.fromInstrumentId === bId && x.toInstrumentId === aId))
  return b?.distanceMm
}

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
  | { kind: 'no-observations' }
  | { kind: 'insufficient' }
  | { kind: 'inconsistent'; instrument1Id: string; instrument2Id: string; baselineMm: number; r1: number; r2: number; mismatchMm: number }
  | { kind: 'accepted-mismatch'; point: Vec2; instrument1Id: string; instrument2Id: string; baselineMm: number; r1: number; r2: number; mismatchMm: number }
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

  if (entries.length === 0) return { kind: 'no-observations' }
  if (entries.length < 2) return { kind: 'insufficient' }

  const [a, b, c] = entries
  const candidates = circleIntersections({ x: a.pos.x, y: a.pos.y }, a.distanceMm, { x: b.pos.x, y: b.pos.y }, b.distanceMm)
  if (candidates.length === 0) {
    const baselineMm = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)
    const mismatchMm = baselineMm > a.distanceMm + b.distanceMm
      ? baselineMm - (a.distanceMm + b.distanceMm)
      : Math.abs(a.distanceMm - b.distanceMm) - baselineMm
    if (target.acceptedDespiteMismatch) {
      const point = circleBestFit({ x: a.pos.x, y: a.pos.y }, a.distanceMm, { x: b.pos.x, y: b.pos.y }, b.distanceMm)
      return { kind: 'accepted-mismatch', point, instrument1Id: a.inst.id, instrument2Id: b.inst.id, baselineMm, r1: a.distanceMm, r2: b.distanceMm, mismatchMm }
    }
    return { kind: 'inconsistent', instrument1Id: a.inst.id, instrument2Id: b.inst.id, baselineMm, r1: a.distanceMm, r2: b.distanceMm, mismatchMm }
  }
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

export function resolvedPointOf(r: TargetResolution): Vec2 | null {
  switch (r.kind) {
    case 'unique': case 'sketch-picked': case 'resolved3': case 'accepted-mismatch': return r.point
    default: return null
  }
}

export type TransferItem = { targetId: string; label: string; position: { x: number; y: number; z: number }; reuseAreaPointId?: string }
export type TransferPlan = { ok: true; items: TransferItem[]; conflicts: string[] } | { ok: false; reason: string }

function p0BlockReason(resolution: TargetResolution): string {
  switch (resolution.kind) {
    case 'no-observations': return 'Nie można ustawić początku układu — brak odczytów odległości do P0 (potrzebne co najmniej dwa, z różnych pozycji dalmierza).'
    case 'insufficient': return 'Nie można ustawić początku układu — do P0 jest tylko jeden odczyt. Dodaj odczyt z drugiej pozycji dalmierza i sprawdź, czy zapisana jest baza między pozycjami.'
    case 'inconsistent': return `P0 ma zapisane oba odczyty, ale są geometrycznie sprzeczne z bazą między pozycjami. Niezgodność: ${Math.round(resolution.mismatchMm)} mm — sprawdź bazę albo jeden z pomiarów.`
    case 'ambiguous': return 'Nie można ustawić początku układu — P0 ma dwa możliwe rozwiązania (niejednoznaczne). Dodaj trzeci odczyt albo popraw szkic.'
    default: return 'Nie można jeszcze ustawić początku układu — P0 nie jest jeszcze rozwiązany.'
  }
}

/**
 * Przelicza rozwiazane punkty wzgledem P0 (P0 staje sie (0,0)) przed przeniesieniem na Rzut.
 * P0 zawsze laczy sie z istniejacym punktem P0 na Rzucie (nigdy nie tworzy drugiego).
 * Inne etykiety kolidujace z istniejacym, niepolaczonym punktem sa zglaszane jako konflikt i pomijane.
 */
export function planTransfer(area: Area, survey: StationSurvey, resolutions: Map<string, TargetResolution>): TransferPlan {
  const p0Target = survey.targets.find((t) => labelOf(t) === 'P0')
  if (!p0Target) return { ok: false, reason: 'Szkic nie ma jeszcze punktu P0 — dodaj punkt, który będzie początkiem układu.' }
  const p0Resolution = resolutions.get(p0Target.id) ?? { kind: 'no-observations' }
  const p0Point = resolvedPointOf(p0Resolution)
  if (!p0Point) return { ok: false, reason: p0BlockReason(p0Resolution) }

  const items: TransferItem[] = []
  const conflicts: string[] = []
  for (const t of survey.targets) {
    const point = resolvedPointOf(resolutions.get(t.id) ?? { kind: 'no-observations' })
    if (!point) continue
    const label = labelOf(t)
    const position = { x: point.x - p0Point.x, y: point.y - p0Point.y, z: 0 }
    const existing = area.points.find((p) => labelOf(p) === label)
    if (label === 'P0') { items.push({ targetId: t.id, label, position, reuseAreaPointId: t.linkedPointId ?? existing?.id }); continue }
    if (existing && existing.id !== t.linkedPointId) { conflicts.push(label); continue }
    items.push({ targetId: t.id, label, position, reuseAreaPointId: t.linkedPointId })
  }
  return { ok: true, items, conflicts }
}

export type TargetStatus = 'none' | 'partial' | 'done' | 'warn'

export function targetStatus(resolution: TargetResolution): TargetStatus {
  switch (resolution.kind) {
    case 'no-observations': return 'none'
    case 'insufficient': return 'partial'
    case 'ambiguous': return 'warn'
    case 'inconsistent': return 'warn'
    case 'accepted-mismatch': return 'warn'
    case 'resolved3': return resolution.residualMm > RESIDUAL_WARN_MM ? 'warn' : 'done'
    default: return 'done'
  }
}

/** Czy do targetu zapisano komplet (min. 2) uzytecznych odczytow - niezaleznie od tego, czy dają spojna geometrie. */
export function hasCompleteReadings(resolution: TargetResolution): boolean {
  return resolution.kind !== 'no-observations' && resolution.kind !== 'insufficient'
}
