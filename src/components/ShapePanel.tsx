import { useEffect, useState } from 'react'
import type { ElementState, Shape } from '../domain/model'

const STATE_LABEL: Record<ElementState, string> = { existing: 'istniejąca', reconstructed: 'odtworzona', proposed: 'projektowana' }
const STATES: ElementState[] = ['existing', 'reconstructed', 'proposed']

export function ShapePanel({ shape, startInEdit, onSave, onClose }: {
  shape: Shape
  startInEdit: boolean
  onSave: (patch: { x: number; y: number; z: number; widthMm?: number; depthMm?: number; rotationDeg?: number; diameterMm?: number; heightMm: number; state: ElementState }) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(startInEdit)
  const [x, setX] = useState(String(shape.center.x))
  const [y, setY] = useState(String(shape.center.y))
  const [z, setZ] = useState(String(shape.center.z))
  const [widthMm, setWidthMm] = useState(String(shape.widthMm ?? 0))
  const [depthMm, setDepthMm] = useState(String(shape.depthMm ?? 0))
  const [rotationDeg, setRotationDeg] = useState(String(shape.rotationDeg ?? 0))
  const [diameterMm, setDiameterMm] = useState(String(shape.diameterMm ?? 0))
  const [heightMm, setHeightMm] = useState(String(shape.heightMm))
  const [state, setState] = useState<ElementState>(shape.state ?? 'existing')

  useEffect(() => {
    setEditing(startInEdit)
    setX(String(shape.center.x)); setY(String(shape.center.y)); setZ(String(shape.center.z))
    setWidthMm(String(shape.widthMm ?? 0)); setDepthMm(String(shape.depthMm ?? 0)); setRotationDeg(String(shape.rotationDeg ?? 0))
    setDiameterMm(String(shape.diameterMm ?? 0)); setHeightMm(String(shape.heightMm)); setState(shape.state ?? 'existing')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.id])

  const num = (v: string) => Number(v.replace(',', '.'))

  const save = () => {
    const xn = num(x); const yn = num(y); const zn = num(z); const h = num(heightMm)
    const vals = shape.kind === 'circle' ? [xn, yn, zn, h, num(diameterMm)] : [xn, yn, zn, h, num(widthMm), num(depthMm), num(rotationDeg)]
    if (!vals.every(Number.isFinite)) return
    onSave({
      x: xn, y: yn, z: zn, heightMm: h, state,
      ...(shape.kind === 'circle' ? { diameterMm: num(diameterMm) } : { widthMm: num(widthMm), depthMm: num(depthMm), rotationDeg: num(rotationDeg) })
    })
    setEditing(false)
  }

  const kindLabel = shape.kind === 'circle' ? 'Koło' : 'Prostokąt'

  return (
    <div className="check-card wall-panel">
      <div className="card-title"><h2>{kindLabel} {shape.id}</h2><button className="secondary" onClick={onClose}>Zamknij</button></div>
      {!editing ? (
        <>
          <div className="wall-info-row"><span>Środek X / Y / Z</span><strong>{shape.center.x} / {shape.center.y} / {shape.center.z} mm</strong></div>
          {shape.kind === 'circle'
            ? <div className="wall-info-row"><span>Średnica</span><strong>{shape.diameterMm ?? 0} mm</strong></div>
            : <>
              <div className="wall-info-row"><span>Szerokość × głębokość</span><strong>{shape.widthMm ?? 0} × {shape.depthMm ?? 0} mm</strong></div>
              <div className="wall-info-row"><span>Obrót</span><strong>{shape.rotationDeg ?? 0}°</strong></div>
            </>}
          <div className="wall-info-row"><span>Wysokość</span><strong>{shape.heightMm} mm</strong></div>
          <div className="wall-info-row"><span>Stan</span><strong>{STATE_LABEL[shape.state ?? 'existing']}</strong></div>
          <button className="primary wide" onClick={() => setEditing(true)}>Edytuj</button>
        </>
      ) : (
        <div className="wall-edit">
          <label>Środek X [mm]<input value={x} onChange={(e) => setX(e.target.value)} inputMode="decimal" /></label>
          <label>Środek Y [mm]<input value={y} onChange={(e) => setY(e.target.value)} inputMode="decimal" /></label>
          <label>Środek Z [mm]<input value={z} onChange={(e) => setZ(e.target.value)} inputMode="decimal" /></label>
          {shape.kind === 'circle' ? (
            <label>Średnica [mm]<input value={diameterMm} onChange={(e) => setDiameterMm(e.target.value)} inputMode="decimal" /></label>
          ) : <>
            <label>Szerokość [mm]<input value={widthMm} onChange={(e) => setWidthMm(e.target.value)} inputMode="decimal" /></label>
            <label>Głębokość [mm]<input value={depthMm} onChange={(e) => setDepthMm(e.target.value)} inputMode="decimal" /></label>
            <label>Obrót [°]<input value={rotationDeg} onChange={(e) => setRotationDeg(e.target.value)} inputMode="decimal" /></label>
          </>}
          <label>Wysokość [mm]<input value={heightMm} onChange={(e) => setHeightMm(e.target.value)} inputMode="decimal" /></label>
          <label>Stan
            <select value={state} onChange={(e) => setState(e.target.value as ElementState)}>
              {STATES.map((s) => <option key={s} value={s}>{STATE_LABEL[s]}</option>)}
            </select>
          </label>
          <button className="primary wide" onClick={save}>Zapisz</button>
        </div>
      )}
    </div>
  )
}
