export type Vec2 = { x: number; y: number }

/** Tolerancja numeryczna w mm - stanowiska/promienie porównywane z dokładnością do mikrometrów. */
const EPS = 1e-6

/**
 * Przecięcie dwóch okręgów (S1,r1) i (S2,r2). Zwraca 0, 1 (styczne) lub 2 punkty.
 * Nie wybiera automatycznie strony - to decyzja użytkownika (patrz pickByThirdStation).
 */
export function circleIntersections(s1: Vec2, r1: number, s2: Vec2, r2: number): Vec2[] {
  const dx = s2.x - s1.x
  const dy = s2.y - s1.y
  const d = Math.hypot(dx, dy)

  if (d < EPS) return [] // stanowiska w tym samym miejscu - konfiguracja nieprawidłowa
  if (d > r1 + r2 + EPS) return [] // okręgi rozłączne
  if (d < Math.abs(r1 - r2) - EPS) return [] // jeden okrąg całkowicie wewnątrz drugiego

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h2 = r1 * r1 - a * a
  const h = Math.sqrt(Math.max(0, h2))

  const mx = s1.x + (a * dx) / d
  const my = s1.y + (a * dy) / d

  if (h < EPS) return [{ x: mx, y: my }] // punkt styczny - jedno rozwiązanie na osi bazy

  const rx = -dy / d
  const ry = dx / d

  return [
    { x: mx + h * rx, y: my + h * ry },
    { x: mx - h * rx, y: my - h * ry }
  ]
}

/**
 * Punkt "najlepszego dopasowania" dla dwóch okręgów, które się nie przecinają (sprzeczne odczyty).
 * Rzut na prostą łączącą stanowiska, w miejscu gdzie okręgi byłyby najbliżej przecięcia.
 * Używane tylko gdy użytkownik świadomie akceptuje niezgodność pomiarów (np. tolerancja budowlana).
 */
export function circleBestFit(s1: Vec2, r1: number, s2: Vec2, r2: number): Vec2 {
  const dx = s2.x - s1.x
  const dy = s2.y - s1.y
  const d = Math.hypot(dx, dy)
  if (d < EPS) return { x: s1.x, y: s1.y }
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  return { x: s1.x + (a * dx) / d, y: s1.y + (a * dy) / d }
}

/**
 * Rozstrzyga niejednoznaczność dwóch kandydatów za pomocą trzeciego stanowiska.
 * Wybiera kandydata z mniejszym residuum, ale zawsze zwraca residuum obu stron -
 * UI powinien oznaczyć punkt do kontroli, jeśli residuum jest duże.
 */
export function pickByThirdStation(candidates: Vec2[], s3: Vec2, r3: number): { point: Vec2; residualMm: number } | null {
  if (candidates.length === 0) return null
  let best = candidates[0]
  let bestResidual = Math.abs(Math.hypot(best.x - s3.x, best.y - s3.y) - r3)
  for (const c of candidates.slice(1)) {
    const residual = Math.abs(Math.hypot(c.x - s3.x, c.y - s3.y) - r3)
    if (residual < bestResidual) { best = c; bestResidual = residual }
  }
  return { point: best, residualMm: bestResidual }
}
