import { labelOf, nextElementId, type Area, type Point3D } from './model'

export type IntegrityIssue = { kind: 'duplicate-label' | 'multiple-p0' | 'dangling-reference'; message: string }

/** Wykrywa problemy integralności punktów; nie usuwa ani nie modyfikuje danych. */
export function checkPointIntegrity(area: Area): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []

  const byLabel = new Map<string, Point3D[]>()
  for (const p of area.points) {
    const label = labelOf(p)
    byLabel.set(label, [...(byLabel.get(label) ?? []), p])
  }
  for (const [label, pts] of byLabel) {
    if (pts.length > 1) issues.push({ kind: label === 'P0' ? 'multiple-p0' : 'duplicate-label', message: `Zduplikowana etykieta ${label} (${pts.length}×)` })
  }

  const ids = new Set(area.points.map((p) => p.id))
  for (const w of area.walls) {
    if (!ids.has(w.from)) issues.push({ kind: 'dangling-reference', message: `Ściana ${w.id}: brak punktu ${w.from}` })
    if (!ids.has(w.to)) issues.push({ kind: 'dangling-reference', message: `Ściana ${w.id}: brak punktu ${w.to}` })
  }
  for (const m of area.measurements) {
    if (m.from && !ids.has(m.from)) issues.push({ kind: 'dangling-reference', message: `Pomiar ${m.id}: brak punktu ${m.from}` })
    if (m.to && !ids.has(m.to)) issues.push({ kind: 'dangling-reference', message: `Pomiar ${m.id}: brak punktu ${m.to}` })
  }
  if (area.activePointId && !ids.has(area.activePointId)) issues.push({ kind: 'dangling-reference', message: `Aktywny punkt ${area.activePointId} nie istnieje` })

  return issues
}

/**
 * Naprawia zduplikowane etykiety: pierwsze wystąpienie zachowuje etykietę,
 * kolejne dostają najmniejszą wolną etykietę P<n>. Nie usuwa i nie scala punktów.
 */
export function repairDuplicateLabels(area: Area): Area {
  const seen = new Set<string>()
  const points = area.points.map((p) => {
    const label = labelOf(p)
    if (!seen.has(label)) { seen.add(label); return p }
    const allLabels = area.points.map(labelOf).concat(Array.from(seen))
    const fresh = nextElementId(allLabels, 'P')
    seen.add(fresh)
    return { ...p, label: fresh }
  })
  return { ...area, points }
}

/** Zmienia widoczną etykietę punktu (id pozostaje niezmienne - relacje nie są naruszane). */
export function renamePointLabel(area: Area, pointId: string, newLabel: string): Area | { error: string } {
  const point = area.points.find((p) => p.id === pointId)
  if (!point) return { error: `Punkt ${pointId} nie istnieje.` }
  if (labelOf(point) === newLabel) return area
  const clash = area.points.find((p) => p.id !== pointId && labelOf(p) === newLabel)
  if (clash) return { error: `Punkt ${newLabel} już istnieje.` }
  return { ...area, points: area.points.map((p) => p.id === pointId ? { ...p, label: newLabel } : p) }
}

/** Ustawia dany punkt jako P0 - zamienia etykiety z dotychczasowym P0 (jeśli istnieje), więc nigdy nie powstają dwa P0. */
export function setPointAsOrigin(area: Area, pointId: string): Area {
  const target = area.points.find((p) => p.id === pointId)
  if (!target || labelOf(target) === 'P0') return area
  const currentP0 = area.points.find((p) => labelOf(p) === 'P0')
  const targetOldLabel = labelOf(target)
  return {
    ...area,
    points: area.points.map((p) => {
      if (p.id === pointId) return { ...p, label: 'P0' }
      if (currentP0 && p.id === currentP0.id) return { ...p, label: targetOldLabel }
      return p
    })
  }
}
