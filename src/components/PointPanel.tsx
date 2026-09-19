import { useEffect, useState } from 'react'
import type { ElementState, Point3D } from '../domain/model'
import { labelOf } from '../domain/model'

const STATE_LABEL: Record<ElementState, string> = { existing: 'istniejąca', reconstructed: 'odtworzona', proposed: 'projektowana' }
const STATES: ElementState[] = ['existing', 'reconstructed', 'proposed']

export function PointPanel({ point, startInEdit, onSave, onClose, onRename, onSetOrigin }: {
  point: Point3D
  startInEdit: boolean
  onSave: (patch: { x: number; y: number; z: number; state: ElementState }) => void
  onClose: () => void
  onRename: (newLabel: string) => string | undefined
  onSetOrigin: () => void
}) {
  const [editing, setEditing] = useState(startInEdit)
  const [x, setX] = useState(String(point.position.x))
  const [y, setY] = useState(String(point.position.y))
  const [z, setZ] = useState(String(point.position.z))
  const [state, setState] = useState<ElementState>(point.state ?? 'existing')
  const [label, setLabel] = useState(labelOf(point))
  const [labelError, setLabelError] = useState<string | null>(null)

  useEffect(() => {
    setEditing(startInEdit)
    setX(String(point.position.x))
    setY(String(point.position.y))
    setZ(String(point.position.z))
    setState(point.state ?? 'existing')
    setLabel(labelOf(point))
    setLabelError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point.id])

  const saveLabel = () => {
    if (label === labelOf(point)) return
    const err = onRename(label)
    if (err) setLabelError(err)
    else setLabelError(null)
  }

  const save = () => {
    const xn = Number(x.replace(',', '.')); const yn = Number(y.replace(',', '.')); const zn = Number(z.replace(',', '.'))
    if (![xn, yn, zn].every(Number.isFinite)) return
    onSave({ x: xn, y: yn, z: zn, state })
    setEditing(false)
  }

  return (
    <div className="check-card wall-panel">
      <div className="card-title"><h2>Punkt {labelOf(point)}</h2><button className="secondary" onClick={onClose}>Zamknij</button></div>
      {!editing ? (
        <>
          <div className="wall-info-row"><span>Pozycja X</span><strong>{point.position.x} mm</strong></div>
          <div className="wall-info-row"><span>Pozycja Y</span><strong>{point.position.y} mm</strong></div>
          <div className="wall-info-row"><span>Pozycja Z</span><strong>{point.position.z} mm</strong></div>
          <div className="wall-info-row"><span>Źródło</span><strong>{point.source === 'measured' ? 'zmierzony' : 'wyliczony'}</strong></div>
          <div className="wall-info-row"><span>Stan</span><strong>{STATE_LABEL[point.state ?? 'existing']}</strong></div>
          <label>Etykieta
            <input value={label} onChange={(e) => { setLabel(e.target.value); setLabelError(null) }} onBlur={saveLabel} />
          </label>
          {labelError && <div className="error-text">{labelError}</div>}
          {labelOf(point) !== 'P0' && <button className="secondary wide" onClick={onSetOrigin}>Ustaw jako P0</button>}
          <button className="primary wide" onClick={() => setEditing(true)}>Edytuj</button>
        </>
      ) : (
        <div className="wall-edit">
          <label>X [mm]<input value={x} onChange={(e) => setX(e.target.value)} inputMode="decimal" /></label>
          <label>Y [mm]<input value={y} onChange={(e) => setY(e.target.value)} inputMode="decimal" /></label>
          <label>Z [mm]<input value={z} onChange={(e) => setZ(e.target.value)} inputMode="decimal" /></label>
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
