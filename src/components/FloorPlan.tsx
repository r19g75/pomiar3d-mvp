import type { Area } from '../domain/model'
import { labelOf } from '../domain/model'
import { areaBounds, pointMap, rectCorners, wallLength } from '../domain/geometry'

export function FloorPlan({ area, onSection, selectedWallId, onWallSelect, selectedPointId, onPointSelect, selectedShapeId, onShapeSelect }: {
  area: Area
  onSection: (id: string) => void
  selectedWallId?: string
  onWallSelect: (id: string) => void
  selectedPointId?: string
  onPointSelect: (id: string) => void
  selectedShapeId?: string
  onShapeSelect: (id: string) => void
}) {
  const points = pointMap(area)
  const b = areaBounds(area)
  const pad = 450
  const width = Math.max(1000, b.maxX - b.minX + pad * 2)
  const height = Math.max(1000, b.maxY - b.minY + pad * 2)
  const tx = (x: number) => x - b.minX + pad
  const ty = (y: number) => b.maxY - y + pad

  return (
    <div className="drawing-card">
      <div className="card-title"><strong>Rzut z góry · {area.name}</strong><span>XY · mm</span></div>
      <svg className="drawing" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rzut z góry">
        {area.walls.map((wall) => {
          const a = points.get(wall.from); const c = points.get(wall.to)
          if (!a || !c) return null
          const cls = wall.status === 'derived' ? 'derived' : wall.status === 'incomplete' ? 'missing' : 'measured'
          const stateCls = wall.state ? `state-${wall.state}` : ''
          const mx = (tx(a.position.x) + tx(c.position.x)) / 2; const my = (ty(a.position.y) + ty(c.position.y)) / 2
          const selected = wall.id === selectedWallId
          const dxw = c.position.x - a.position.x; const dyw = c.position.y - a.position.y
          const lenw = Math.hypot(dxw, dyw) || 1
          const nxw = -dyw / lenw; const nyw = dxw / lenw
          const side = wall.thicknessSide ?? 1
          const midW = { x: (a.position.x + c.position.x) / 2, y: (a.position.y + c.position.y) / 2 }
          const tickW = { x: midW.x + nxw * side * 220, y: midW.y + nyw * side * 220 }
          return <g key={wall.id} className="wall-group" onClick={() => onWallSelect(wall.id)}>
            <line className="wall-hit" x1={tx(a.position.x)} y1={ty(a.position.y)} x2={tx(c.position.x)} y2={ty(c.position.y)} />
            <line className={`wall ${cls} ${stateCls} ${selected ? 'selected' : ''}`} x1={tx(a.position.x)} y1={ty(a.position.y)} x2={tx(c.position.x)} y2={ty(c.position.y)} />
            <line className="wall-thickness-tick" x1={mx} y1={my} x2={tx(tickW.x)} y2={ty(tickW.y)} />
            <text x={mx} y={my - 55} className="svg-label">{wall.id} · {Math.round(wallLength(wall, points))}</text>
            {wall.status === 'incomplete' && <text x={mx} y={my + 120} className="svg-missing">?</text>}
          </g>
        })}
        {area.points.map((p) => {
          const selected = p.id === selectedPointId
          return <g key={p.id} className="point-group" onClick={() => onPointSelect(p.id)}>
            <circle className="point-hit" cx={tx(p.position.x)} cy={ty(p.position.y)} r="380" />
            <circle className={`point ${p.source === 'measured' ? 'measured' : 'derived'} ${selected ? 'selected' : ''}`} cx={tx(p.position.x)} cy={ty(p.position.y)} r="34" />
            <text x={tx(p.position.x) + 55} y={ty(p.position.y) - 55} className="svg-label">{labelOf(p)}</text>
          </g>
        })}
        {area.shapes.map((shape) => {
          const selected = shape.id === selectedShapeId
          const cls = shape.status === 'derived' ? 'derived' : shape.status === 'incomplete' ? 'missing' : 'measured'
          const stateCls = shape.state ? `state-${shape.state}` : ''
          const label = shape.kind === 'circle' ? `${shape.id} · ⌀${shape.diameterMm ?? 0}` : `${shape.id} · ${shape.widthMm ?? 0}×${shape.depthMm ?? 0}`
          const cx = tx(shape.center.x); const cy = ty(shape.center.y)
          return <g key={shape.id} className="shape-group" onClick={() => onShapeSelect(shape.id)}>
            {shape.kind === 'circle' ? (
              <circle className={`shape ${cls} ${stateCls} ${selected ? 'selected' : ''}`} cx={cx} cy={cy} r={(shape.diameterMm ?? 0) / 2} />
            ) : (
              <polygon className={`shape ${cls} ${stateCls} ${selected ? 'selected' : ''}`} points={rectCorners(shape).map((c) => `${tx(c.x)},${ty(c.y)}`).join(' ')} />
            )}
            <text x={cx} y={cy - 55} className="svg-label">{label}</text>
            {shape.status === 'incomplete' && <text x={cx} y={cy + 120} className="svg-missing">?</text>}
          </g>
        })}
        {area.sections.map((section) => {
          const isY = section.axis === 'y'; const pos = section.stationMm
          const x1 = isY ? tx(b.minX - 200) : tx(pos); const y1 = isY ? ty(pos) : ty(b.minY - 200)
          const x2 = isY ? tx(b.maxX + 200) : tx(pos); const y2 = isY ? ty(pos) : ty(b.maxY + 200)
          const done = section.points.filter((p) => p.measured && p.zMm !== null).length
          return <g key={section.id} onClick={() => onSection(section.id)} className="section-hit">
            <line className="section-line" x1={x1} y1={y1} x2={x2} y2={y2} />
            <text x={x1 + 40} y={y1 - 40} className="section-label">{section.name} {section.lookDirection === 1 ? '→' : '←'} · {done}/{section.points.length}</text>
          </g>
        })}
      </svg>
      <div className="legend"><span>━━ zmierzone</span><span>┅┅ wyliczone</span><span>━━ ? brak</span><span>odtworzone = osobny stan danych</span></div>
    </div>
  )
}
