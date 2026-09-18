import type { Section } from '../domain/model'

export function SectionView({ section, onFillMissing }: { section: Section; onFillMissing: (pointId: string, value: number) => void }) {
  const known = section.points.filter((p) => p.zMm !== null)
  const maxX = Math.max(1000, ...section.points.map((p) => p.offsetMm))
  const maxZ = Math.max(1000, ...known.map((p) => p.zMm ?? 0))
  const pad = 260
  const width = maxX + pad * 2
  const height = maxZ + pad * 2
  const tx = (x: number) => x + pad
  const ty = (z: number) => height - pad - z
  const polyPoints = known.sort((a, b) => a.offsetMm - b.offsetMm).map((p) => `${tx(p.offsetMm)},${ty(p.zMm!)}`).join(' ')
  const missing = section.points.filter((p) => !p.measured || p.zMm === null)

  return (
    <div className="section-layout">
      <div className="drawing-card">
        <div className="card-title"><strong>Przekrój {section.name}</strong><span>{section.lookDirection === 1 ? 'patrzymy →' : 'patrzymy ←'}</span></div>
        <svg className="drawing" viewBox={`0 0 ${width} ${height}`}>
          <line className="axis" x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} />
          <polyline className="section-profile" points={polyPoints} fill="none" />
          {section.points.map((p) => {
            const z = p.zMm ?? 0
            return (
              <g key={p.id}>
                <circle className={p.measured && p.zMm !== null ? 'point measured' : 'point missing'} cx={tx(p.offsetMm)} cy={ty(z)} r="35" />
                <text className="svg-label" x={tx(p.offsetMm)+45} y={ty(z)-45}>{p.id}</text>
                <text className="svg-small" x={tx(p.offsetMm)+45} y={ty(z)+45}>{p.offsetMm} / {p.zMm ?? '?'}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="check-card">
        <h3>Kontrola pomiaru</h3>
        {section.points.map((p) => (
          <div className="check-row" key={p.id}>
            <span className={p.measured && p.zMm !== null ? 'ok' : 'bad'}>{p.measured && p.zMm !== null ? '✓' : '?'}</span>
            <span><strong>{p.id}</strong> · x={p.offsetMm} · z={p.zMm ?? 'brak'} mm {p.note ? `· ${p.note}` : ''}</span>
          </div>
        ))}
        {missing.map((p) => (
          <button key={p.id} className="secondary" onClick={() => {
            const raw = window.prompt(`Wysokość Z dla ${p.id} [mm]`)
            if (raw && Number.isFinite(Number(raw.replace(',', '.')))) onFillMissing(p.id, Number(raw.replace(',', '.')))
          }}>Uzupełnij {p.id}</button>
        ))}
      </div>
    </div>
  )
}
