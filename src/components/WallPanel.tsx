import { useEffect, useState } from 'react'
import type { Area, ElementState, Wall } from '../domain/model'
import { pointMap, wallLength } from '../domain/geometry'

const STATE_LABEL: Record<ElementState, string> = { existing: 'istniejąca', reconstructed: 'odtworzona', proposed: 'projektowana' }
const STATES: ElementState[] = ['existing', 'reconstructed', 'proposed']

export function WallPanel({ area, wall, startInEdit, onSave, onRemeasure, onClose }: {
  area: Area
  wall: Wall
  startInEdit: boolean
  onSave: (patch: { heightMm: number; thicknessMm: number; state: ElementState }) => void
  onRemeasure: (newLengthMm: number) => void
  onClose: () => void
}) {
  const points = pointMap(area)
  const length = Math.round(wallLength(wall, points))
  const [editing, setEditing] = useState(startInEdit)
  const [heightMm, setHeightMm] = useState(String(wall.heightMm))
  const [thicknessMm, setThicknessMm] = useState(String(wall.thicknessMm))
  const [state, setState] = useState<ElementState>(wall.state ?? 'existing')
  const [lengthMm, setLengthMm] = useState(String(length))

  useEffect(() => {
    setEditing(startInEdit)
    setHeightMm(String(wall.heightMm))
    setThicknessMm(String(wall.thicknessMm))
    setState(wall.state ?? 'existing')
    setLengthMm(String(Math.round(wallLength(wall, points))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wall.id])

  const save = () => {
    const h = Number(heightMm.replace(',', '.'))
    const t = Number(thicknessMm.replace(',', '.'))
    const l = Number(lengthMm.replace(',', '.'))
    if (!Number.isFinite(h) || !Number.isFinite(t) || !Number.isFinite(l)) return
    if (Math.round(l) !== length) onRemeasure(l)
    onSave({ heightMm: h, thicknessMm: t, state })
    setEditing(false)
  }

  return (
    <div className="check-card wall-panel">
      <div className="card-title"><h2>Ściana {wall.id}</h2><button className="secondary" onClick={onClose}>Zamknij</button></div>
      {!editing ? (
        <>
          <div className="wall-info-row"><span>Punkty</span><strong>{wall.from} → {wall.to}</strong></div>
          <div className="wall-info-row"><span>Długość</span><strong>{length} mm</strong></div>
          <div className="wall-info-row"><span>Wysokość</span><strong>{wall.heightMm} mm</strong></div>
          <div className="wall-info-row"><span>Grubość</span><strong>{wall.thicknessMm} mm</strong></div>
          <div className="wall-info-row"><span>Stan</span><strong>{STATE_LABEL[wall.state ?? 'existing']}</strong></div>
          <button className="primary wide" onClick={() => setEditing(true)}>Edytuj</button>
        </>
      ) : (
        <div className="wall-edit">
          <label>Długość {wall.from}→{wall.to} [mm]<input value={lengthMm} onChange={(e) => setLengthMm(e.target.value)} inputMode="decimal" /></label>
          <label>Wysokość [mm]<input value={heightMm} onChange={(e) => setHeightMm(e.target.value)} inputMode="decimal" /></label>
          <label>Grubość [mm]<input value={thicknessMm} onChange={(e) => setThicknessMm(e.target.value)} inputMode="decimal" /></label>
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
