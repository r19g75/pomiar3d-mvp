import type { Area, Point3D, Wall } from './model'

export function pointMap(area: Area) {
  return new Map(area.points.map((p) => [p.id, p]))
}

export function wallLength(wall: Wall, points: Map<string, Point3D>) {
  const a = points.get(wall.from)
  const b = points.get(wall.to)
  if (!a || !b) return 0
  return Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y)
}

export function areaBounds(area: Area) {
  const xs = area.points.map((p) => p.position.x)
  const ys = area.points.map((p) => p.position.y)
  if (!xs.length || !ys.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

export function areaMissingCount(area: Area) {
  return area.sections.flatMap((s) => s.points).filter((p) => !p.measured || p.zMm === null).length
    + area.walls.filter((w) => w.status === 'incomplete').length
}

export function areaCompletion(area: Area) {
  const sectionPoints = area.sections.flatMap((s) => s.points)
  const total = Math.max(1, area.walls.length + sectionPoints.length)
  const done = area.walls.filter((w) => w.status !== 'incomplete').length
    + sectionPoints.filter((p) => p.measured && p.zMm !== null).length
  return Math.round((done / total) * 100)
}
