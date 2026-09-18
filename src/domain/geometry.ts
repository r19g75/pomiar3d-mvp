import type { Area, Point3D, Shape, Vec3, Wall } from './model'

export function pointMap(area: Area) {
  return new Map(area.points.map((p) => [p.id, p]))
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
