import { useState } from 'react'
import type { Area } from '../domain/model'
import { nextElementId } from '../domain/model'

export type AddType = 'point' | 'wall' | 'rectangle' | 'circle'

const TYPE_LABEL: Record<AddType, string> = { point: 'Punkt', wall: 'Ściana', rectangle: 'Prostokąt', circle: 'Koło' }
const TYPES: AddType[] = ['point', 'wall', 'rectangle', 'circle']

export function AddElementPanel({ area, lastType, onTypeChange, onCreatePoint, onCreateWall, onCreateShape, onClose }: {
  area: Area
  lastType: AddType
  onTypeChange: (t: AddType) => void
  onCreatePoint: (id: string, x: number, y: number, z: number) => void
  onCreateWall: (id: string, from: string, to: string, heightMm: number, thicknessMm: number) => void
  onCreateShape: (id: string, kind: 'rectangle' | 'circle', x: number, y: number, z: number, dims: { widthMm?: number; depthMm?: number; rotationDeg?: number; diameterMm?: number }, heightMm: number) => void
  onClose: () => void
}) {
  const base = area.points.find((p) => p.id === area.activePointId)?.position ?? { x: 0, y: 0, z: 0 }
  const [x, setX] = useState(String(base.x))
  const [y, setY] = useState(String(base.y))
  const [z, setZ] = useState(String(base.z))
  const [from, setFrom] = useState(area.activePointId ?? area.points[0]?.id ?? '')
  const [to, setTo] = useState(area.points.find((p) => p.id !== area.activePointId)?.id ?? area.points[0]?.id ?? '')
  const [heightMm, setHeightMm] = useState('2500')
  const [thicknessMm, setThicknessMm] = useState('100')
  const [widthMm, setWidthMm] = useState('200')
  const [depthMm, setDepthMm] = useState('200')
  const [rotationDeg, setRotationDeg] = useState('0')
  const [diameterMm, setDiameterMm] = useState('200')

  const num = (v: string) => Number(v.replace(',', '.'))

  const nextId = lastType === 'point' ? nextElementId(area.points.map((p) => p.id), 'P')
    : lastType === 'wall' ? nextElementId(area.walls.map((w) => w.id), 'W')
    : lastType === 'rectangle' ? nextElementId(area.shapes.filter((s) => s.kind === 'rectangle').map((s) => s.id), 'R')
    : nextElementId(area.shapes.filter((s) => s.kind === 'circle').map((s) => s.id), 'C')

  const save = () => {
    if (lastType === 'point') {
      const xn = num(x); const yn = num(y); const zn = num(z)
      if (![xn, yn, zn].every(Number.isFinite)) return
      onCreatePoint(nextId, xn, yn, zn)
    } else if (lastType === 'wall') {
      const h = num(heightMm); const t = num(thicknessMm)
      if (!from || !to || from === to || !Number.isFinite(h) || !Number.isFinite(t)) return
      onCreateWall(nextId, from, to, h, t)
    } else {
      const xn = num(x); const yn = num(y); const zn = num(z); const h = num(heightMm)
      if (lastType === 'circle') {
        const d = num(diameterMm)
        if (![xn, yn, zn, h, d].every(Number.isFinite)) return
        onCreateShape(nextId, 'circle', xn, yn, zn, { diameterMm: d }, h)
      } else {
        const w = num(widthMm); const dp = num(depthMm); const r = num(rotationDeg)
        if (![xn, yn, zn, h, w, dp, r].every(Number.isFinite)) return
        onCreateShape(nextId, 'rectangle', xn, yn, zn, { widthMm: w, depthMm: dp, rotationDeg: r }, h)
      }
    }
    onClose()
  }

  return (
    <div className="check-card wall-panel">
      <div className="card-title"><h2>Dodaj element</h2><button className="secondary" onClick={onClose}>Zamknij</button></div>
      <div className="section-tabs">
        {TYPES.map((t) => <button key={t} className={t === lastType ? 'active' : ''} onClick={() => onTypeChange(t)}>{TYPE_LABEL[t]}</button>)}
      </div>
      <div className="wall-edit">
        <div className="wall-info-row"><span>ID</span><strong>{nextId}</strong></div>

        {lastType === 'point' && <>
          <label>X [mm]<input value={x} onChange={(e) => setX(e.target.value)} inputMode="decimal" /></label>
          <label>Y [mm]<input value={y} onChange={(e) => setY(e.target.value)} inputMode="decimal" /></label>
          <label>Z [mm]<input value={z} onChange={(e) => setZ(e.target.value)} inputMode="decimal" /></label>
        </>}

        {lastType === 'wall' && <>
          <label>Od punktu
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {area.points.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </label>
          <label>Do punktu
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {area.points.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </label>
          <label>Wysokość [mm]<input value={heightMm} onChange={(e) => setHeightMm(e.target.value)} inputMode="decimal" /></label>
          <label>Grubość [mm]<input value={thicknessMm} onChange={(e) => setThicknessMm(e.target.value)} inputMode="decimal" /></label>
        </>}

        {(lastType === 'rectangle' || lastType === 'circle') && <>
          <label>Środek X [mm]<input value={x} onChange={(e) => setX(e.target.value)} inputMode="decimal" /></label>
          <label>Środek Y [mm]<input value={y} onChange={(e) => setY(e.target.value)} inputMode="decimal" /></label>
          <label>Środek Z [mm]<input value={z} onChange={(e) => setZ(e.target.value)} inputMode="decimal" /></label>
          {lastType === 'circle'
            ? <label>Średnica [mm]<input value={diameterMm} onChange={(e) => setDiameterMm(e.target.value)} inputMode="decimal" /></label>
            : <>
              <label>Szerokość [mm]<input value={widthMm} onChange={(e) => setWidthMm(e.target.value)} inputMode="decimal" /></label>
              <label>Głębokość [mm]<input value={depthMm} onChange={(e) => setDepthMm(e.target.value)} inputMode="decimal" /></label>
              <label>Obrót [°]<input value={rotationDeg} onChange={(e) => setRotationDeg(e.target.value)} inputMode="decimal" /></label>
            </>}
          <label>Wysokość [mm]<input value={heightMm} onChange={(e) => setHeightMm(e.target.value)} inputMode="decimal" /></label>
        </>}

        <button className="primary wide" onClick={save}>Zapisz {TYPE_LABEL[lastType].toLowerCase()}</button>
      </div>
    </div>
  )
}
