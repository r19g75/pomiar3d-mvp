import type { Area, Id, Point3D, Shape, Vec3, Wall } from './model'

export function pointMap(area: Area) {
  return new Map(area.points.map((p) => [p.id, p]))
}

/**
 * Znajduje zamknięty obrys zawierający daną ścianę (przechodząc przez sąsiednie ściany
 * po dokładnie jednej niekończącej się gałęzi). Zwraca null przy rozgałęzieniach/otwartych
 * fragmentach - w takich sytuacjach strona grubości musi być ustawiona ręcznie.
 */
export function findClosedLoop(wall: Wall, walls: Wall[]): Id[] | null {
  const adjacency = new Map<Id, { to: Id; wallId: Id }[]>()
  for (const w of walls) {
    if (!adjacency.has(w.from)) adjacency.set(w.from, [])
    if (!adjacency.has(w.to)) adjacency.set(w.to, [])
    adjacency.get(w.from)!.push({ to: w.to, wallId: w.id })
    adjacency.get(w.to)!.push({ to: w.from, wallId: w.id })
  }
  const start = wall.from
  const loop: Id[] = [start]
  let current = wall.to
  let cameFromWallId = wall.id
  const visitedWalls = new Set([wall.id])
  while (current !== start) {
    loop.push(current)
    const neighbors = (adjacency.get(current) ?? []).filter((n) => n.wallId !== cameFromWallId)
    if (neighbors.length !== 1) return null
    const next = neighbors[0]
    if (visitedWalls.has(next.wallId)) return null
    visitedWalls.add(next.wallId)
    cameFromWallId = next.wallId
    current = next.to
  }
  return loop.length >= 3 ? loop : null
}

export function signedPolygonArea(points: { x: number; y: number }[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]; const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

/**
 * Wykrywa kierunek obiegu zamkniętego obrysu zawierającego ścianę i zwraca stronę,
 * po której grubość wypada na zewnątrz. Zwraca null gdy obrys nie jest jednoznaczny
 * (rozgałęzienia, otwarty fragment) - wtedy potrzebna jest ręczna decyzja użytkownika.
 */
export function autoThicknessSide(wall: Wall, area: Area): 1 | -1 | null {
  const loop = findClosedLoop(wall, area.walls)
  if (!loop) return null
  const points = pointMap(area)
  const loopPts = loop.map((id) => points.get(id)?.position)
  if (loopPts.some((p) => !p)) return null
  const signedArea = signedPolygonArea(loopPts as Vec3[])
  if (signedArea === 0) return null
  const isCCW = signedArea > 0
  const a = points.get(wall.from)!.position; const b = points.get(wall.to)!.position
  const dxw = b.x - a.x; const dyw = b.y - a.y
  const outward = isCCW ? { x: dyw, y: -dxw } : { x: -dyw, y: dxw }
  const n = { x: -dyw, y: dxw }
  return outward.x * n.x + outward.y * n.y >= 0 ? 1 : -1
}

/** Strona grubości do rysowania: ręczne ustawienie ma priorytet, inaczej auto-wykrycie z obrysu, inaczej domyślnie 1. */
export function effectiveThicknessSide(wall: Wall, area: Area): 1 | -1 {
  return wall.thicknessSide ?? autoThicknessSide(wall, area) ?? 1
}

export function wallLength(wall: Wall, points: Map<string, Point3D>) {
  const a = points.get(wall.from)
  const b = points.get(wall.to)
  if (!a || !b) return 0
  return Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y)
}

export function movePointForLength(from: Point3D, to: Point3D, newLengthMm: number): Vec3 {
  const dx = to.position.x - from.position.x
  const dy = to.position.y - from.position.y
  const dist = Math.hypot(dx, dy)
  if (dist === 0) return { ...to.position }
  const scale = newLengthMm / dist
  return { x: from.position.x + dx * scale, y: from.position.y + dy * scale, z: to.position.z }
}

export function areaBounds(area: Area) {
  const xs = area.points.map((p) => p.position.x)
  const ys = area.points.map((p) => p.position.y)
  for (const shape of area.shapes) {
    const r = shape.kind === 'circle' ? (shape.diameterMm ?? 0) / 2 : Math.hypot((shape.widthMm ?? 0) / 2, (shape.depthMm ?? 0) / 2)
    xs.push(shape.center.x - r, shape.center.x + r)
    ys.push(shape.center.y - r, shape.center.y + r)
  }
  if (!xs.length || !ys.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

export function areaMissingCount(area: Area) {
  return area.sections.flatMap((s) => s.points).filter((p) => !p.measured || p.zMm === null).length
    + area.walls.filter((w) => w.status === 'incomplete').length
    + area.shapes.filter((s) => s.status === 'incomplete').length
}

export function areaCompletion(area: Area) {
  const sectionPoints = area.sections.flatMap((s) => s.points)
  const total = Math.max(1, area.walls.length + area.shapes.length + sectionPoints.length)
  const done = area.walls.filter((w) => w.status !== 'incomplete').length
    + area.shapes.filter((s) => s.status !== 'incomplete').length
    + sectionPoints.filter((p) => p.measured && p.zMm !== null).length
  return Math.round((done / total) * 100)
}

export function rectCorners(shape: Shape): Vec3[] {
  const w = (shape.widthMm ?? 0) / 2
  const d = (shape.depthMm ?? 0) / 2
  const rad = ((shape.rotationDeg ?? 0) * Math.PI) / 180
  const cos = Math.cos(rad); const sin = Math.sin(rad)
  const local = [[-w, -d], [w, -d], [w, d], [-w, d]]
  return local.map(([lx, ly]) => ({
    x: shape.center.x + lx * cos - ly * sin,
    y: shape.center.y + lx * sin + ly * cos,
    z: shape.center.z
  }))
}
