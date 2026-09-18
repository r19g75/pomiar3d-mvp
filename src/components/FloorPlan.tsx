import type { Area } from '../domain/model'
import { areaBounds, pointMap, wallLength } from '../domain/geometry'

export function FloorPlan({ area, onSection }: { area: Area; onSection: (id: string) => void }) {
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
          return <g key={wall.id}>
            <line className={`wall ${cls} ${stateCls}`} x1={tx(a.position.x)} y1={ty(a.position.y)} x2={tx(c.position.x)} y2={ty(c.position.y)} />
            <text x={mx} y={my - 55} className="svg-label">{wall.id} · {Math.round(wallLength(wall, points))}</text>
            {wall.status === 'incomplete' && <text x={mx} y={my + 120} className="svg-missing">?</text>}
          </g>
        })}
        {area.points.map((p) => <g key={p.id}>
          <circle className={p.source === 'measured' ? 'point measured' : 'point derived'} cx={tx(p.position.x)} cy={ty(p.position.y)} r="34" />
          <text x={tx(p.position.x) + 55} y={ty(p.position.y) - 55} className="svg-label">{p.id}</text>
        </g>)}
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
