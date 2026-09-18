import { useEffect, useState } from 'react'
import type { Area, ElementState, Wall } from '../domain/model'
import { pointMap, wallLength } from '../domain/geometry'

const STATE_LABEL: Record<ElementState, string> = { existing: 'istniejąca', reconstructed: 'odtworzona', proposed: 'projektowana' }
const STATES: ElementState[] = ['existing', 'reconstructed', 'proposed']

export function WallPanel({ area, wall, startInEdit, onSave, onControlMeasure, onApplyMeasurement, onReverseSide, onClose }: {
  area: Area
  wall: Wall
  startInEdit: boolean
  onSave: (patch: { heightMm: number; thicknessMm: number; state: ElementState }) => void
  onControlMeasure: (valueMm: number) => void
  onApplyMeasurement: (valueMm: number) => void
  onReverseSide: () => void
  onClose: () => void
}) {
  const points = pointMap(area)
  const length = Math.round(wallLength(wall, points))
  const [editing, setEditing] = useState(startInEdit)
  const [heightMm, setHeightMm] = useState(String(wall.heightMm))
  const [thicknessMm, setThicknessMm] = useState(String(wall.thicknessMm))
  const [state, setState] = useState<ElementState>(wall.state ?? 'existing')
  const [measuring, setMeasuring] = useState(false)
  const [measureValue, setMeasureValue] = useState(String(length))

  useEffect(() => {
    setEditing(startInEdit)
    setHeightMm(String(wall.heightMm))
    setThicknessMm(String(wall.thicknessMm))
    setState(wall.state ?? 'existing')
    setMeasuring(false)
    setMeasureValue(String(Math.round(wallLength(wall, points))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wall.id])

  const lastMeasurement = [...area.measurements].reverse().find((m) =>
    m.kind === 'distance' && ((m.from === wall.from && m.to === wall.to) || (m.from === wall.to && m.to === wall.from))
  )
  const lastValue = lastMeasurement?.valueMm !== undefined ? Math.round(lastMeasurement.valueMm) : undefined
  const diff = lastValue !== undefined ? lastValue - length : 0
  const hasDiff = lastValue !== undefined && diff !== 0

  const save = () => {
    const h = Number(heightMm.replace(',', '.'))
    const t = Number(thicknessMm.replace(',', '.'))
    if (!Number.isFinite(h) || !Number.isFinite(t)) return
    onSave({ heightMm: h, thicknessMm: t, state })
    setEditing(false)
  }

  const submitMeasure = () => {
    const v = Number(measureValue.replace(',', '.'))
    if (!Number.isFinite(v)) return
    onControlMeasure(v)
    setMeasuring(false)
  }

  return (
    <div className="check-card wall-panel">
      <div className="card-title"><h2>Ściana {wall.id}</h2><button className="secondary" onClick={onClose}>Zamknij</button></div>
      <div className="wall-info-row"><span>Punkty</span><strong>{wall.from} → {wall.to}</strong></div>
      <div className="wall-info-row"><span>Długość wynikowa</span><strong>{length} mm</strong></div>
      {hasDiff && (
        <div className="wall-info-row"><span>Pomiar kontrolny</span><strong>{lastValue} mm · różnica {diff > 0 ? '+' : ''}{diff} mm</strong></div>
      )}
      <div className="wall-info-row"><span>Strona grubości</span><strong>{(wall.thicknessSide ?? 1) === 1 ? 'A' : 'B'}</strong></div>
      <button className="secondary wide" onClick={onReverseSide}>Odwróć stronę ściany</button>
      {!editing ? (
        <>
          <div className="wall-info-row"><span>Wysokość</span><strong>{wall.heightMm} mm</strong></div>
          <div className="wall-info-row"><span>Grubość</span><strong>{wall.thicknessMm} mm</strong></div>
          <div className="wall-info-row"><span>Stan</span><strong>{STATE_LABEL[wall.state ?? 'existing']}</strong></div>
          <button className="primary wide" onClick={() => setEditing(true)}>Edytuj</button>
        </>
      ) : (
        <div className="wall-edit">
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

      {hasDiff && lastValue !== undefined && (
        <button className="secondary wide" onClick={() => onApplyMeasurement(lastValue)}>Zastosuj pomiar do geometrii</button>
      )}

      {!measuring ? (
        <button className="secondary wide" onClick={() => setMeasuring(true)}>+ Pomiar kontrolny długości</button>
      ) : (
        <div className="wall-edit">
          <label>Zmierzona długość {wall.from}→{wall.to} [mm]<input value={measureValue} onChange={(e) => setMeasureValue(e.target.value)} inputMode="decimal" /></label>
          <button className="primary wide" onClick={submitMeasure}>Zapisz pomiar</button>
        </div>
      )}
    </div>
  )
}
