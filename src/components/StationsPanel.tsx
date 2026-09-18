import { useMemo, useState } from 'react'
import type { Area, StationObservation, StationSurvey, SurveyStation } from '../domain/model'
import { circleIntersections, pickByThirdStation, type Vec2 } from '../domain/trilateration'

const RESIDUAL_WARN_MM = 50

export function StationsPanel({ area, onAddStation, onCreateSurvey, onAddTarget, onAddObservation, onApplyResolvedPoint, onCreateWallsFromOutline }: {
  area: Area
  onAddStation: (label: string, x: number, y: number, z: number) => void
  onCreateSurvey: (name: string) => void
  onAddTarget: (surveyId: string, pointId: string) => void
  onAddObservation: (surveyId: string, stationId: string, targetPointId: string, distanceMm: number) => void
  onApplyResolvedPoint: (pointId: string, x: number, y: number, z: number) => void
  onCreateWallsFromOutline: (surveyId: string) => void
}) {
  const stations = area.stations ?? []
  const surveys = area.stationSurveys ?? []
  const survey = surveys[surveys.length - 1]

  const [stLabel, setStLabel] = useState(stations.length === 0 ? 'S1' : `S${stations.length + 1}`)
  const [stX, setStX] = useState('0')
  const [stY, setStY] = useState(stations.length === 1 ? '3000' : '0')
  const [stZ, setStZ] = useState('0')
  const [surveyName, setSurveyName] = useState('Pomiar ze stanowisk 1')
  const [newTargetId, setNewTargetId] = useState('')

  const addStation = () => {
    const x = Number(stX.replace(',', '.')); const y = Number(stY.replace(',', '.')); const z = Number(stZ.replace(',', '.'))
    if (!stLabel.trim() || ![x, y, z].every(Number.isFinite)) return
    onAddStation(stLabel.trim(), x, y, z)
    setStLabel(`S${stations.length + 2}`)
  }

  const addTarget = () => {
    if (!survey || !newTargetId.trim()) return
    onAddTarget(survey.id, newTargetId.trim())
    setNewTargetId('')
  }

  return (
    <div className="list-card">
      <div className="card-title"><h2>Stanowiska (trilateracja)</h2><span>{stations.length} stanowisk</span></div>
      <p className="muted">Pomiar ze stanowisk (trilateracja): dwa lub trzy stanowiska i odległości do punktów wyznaczają ich położenie. Nie miesza się z ręcznym rysowaniem ścian na Rzucie.</p>
      <p className="muted"><small>Stanowisko oznacza punkt odniesienia dalmierza. Przy obrocie powinien pozostawać możliwie stały.</small></p>

      <h3>Stanowiska</h3>
      {stations.length === 0 && <p>Brak stanowisk. Dodaj S1 (np. (0,0,0)) i S2 (baza, np. (3000,0,0)) — baza musi być zmierzona, nie „około”.</p>}
      <div className="session-list">
        {stations.map((s) => (
          <div className="session-row" key={s.id}>
            <span><strong>{s.label ?? s.id}</strong><small>x={s.position.x} y={s.position.y} z={s.position.z} mm</small></span>
          </div>
        ))}
      </div>
      <div className="wall-edit">
        <label>Etykieta<input value={stLabel} onChange={(e) => setStLabel(e.target.value)} /></label>
        <label>X [mm]<input value={stX} onChange={(e) => setStX(e.target.value)} inputMode="decimal" /></label>
        <label>Y [mm]<input value={stY} onChange={(e) => setStY(e.target.value)} inputMode="decimal" /></label>
        <label>Z [mm]<input value={stZ} onChange={(e) => setStZ(e.target.value)} inputMode="decimal" /></label>
        <button className="secondary wide" onClick={addStation}>+ Dodaj stanowisko</button>
      </div>

      <h3>Pomiar</h3>
      {!survey ? (
        <div className="wall-edit">
          <label>Nazwa pomiaru<input value={surveyName} onChange={(e) => setSurveyName(e.target.value)} /></label>
          <button className="primary wide" disabled={stations.length < 2} onClick={() => onCreateSurvey(surveyName.trim() || 'Pomiar ze stanowisk')}>Nowy pomiar ze stanowisk</button>
          {stations.length < 2 && <small>Potrzebne są co najmniej dwa stanowiska.</small>}
        </div>
      ) : (
        <SurveyBody
          area={area}
          survey={survey}
          stations={stations}
          onAddObservation={onAddObservation}
          onApplyResolvedPoint={onApplyResolvedPoint}
          onCreateWallsFromOutline={onCreateWallsFromOutline}
        />
      )}
      {survey && (
        <div className="wall-edit">
          <label>Nowy punkt docelowy (ID, np. P5)<input value={newTargetId} onChange={(e) => setNewTargetId(e.target.value)} /></label>
          <button className="secondary wide" onClick={addTarget}>+ Dodaj target do pomiaru</button>
        </div>
      )}
    </div>
  )
}

function SurveyBody({ area, survey, stations, onAddObservation, onApplyResolvedPoint, onCreateWallsFromOutline }: {
  area: Area
  survey: StationSurvey
  stations: SurveyStation[]
  onAddObservation: (surveyId: string, stationId: string, targetPointId: string, distanceMm: number) => void
  onApplyResolvedPoint: (pointId: string, x: number, y: number, z: number) => void
  onCreateWallsFromOutline: (surveyId: string) => void
}) {
  return (
    <div>
      <div className="wall-info-row"><span>Plan</span><strong>{survey.plane.toUpperCase()}</strong></div>
      <div className="wall-info-row"><span>Targety</span><strong>{survey.targetOrder.join(', ') || 'brak'}</strong></div>
      {survey.targetOrder.map((targetId) => (
        <TargetRow
          key={targetId}
          targetId={targetId}
          area={area}
          survey={survey}
          stations={stations}
          onAddObservation={onAddObservation}
          onApplyResolvedPoint={onApplyResolvedPoint}
        />
      ))}
      <button className="secondary wide" disabled={survey.targetOrder.length < 2} onClick={() => onCreateWallsFromOutline(survey.id)}>Utwórz ściany z obrysu</button>
    </div>
  )
}

function TargetRow({ targetId, area, survey, stations, onAddObservation, onApplyResolvedPoint }: {
  targetId: string
  area: Area
  survey: StationSurvey
  stations: SurveyStation[]
  onAddObservation: (surveyId: string, stationId: string, targetPointId: string, distanceMm: number) => void
  onApplyResolvedPoint: (pointId: string, x: number, y: number, z: number) => void
}) {
  const [stationId, setStationId] = useState(stations[0]?.id ?? '')
  const [distance, setDistance] = useState('')
  const [pickedSide, setPickedSide] = useState<0 | 1>(0)

  const observations = survey.observations.filter((o) => o.targetPointId === targetId)
  const byStation = (sid: string) => observations.filter((o) => o.stationId === sid).slice(-1)[0]

  const submit = () => {
    const v = Number(distance.replace(',', '.'))
    if (!stationId || !Number.isFinite(v) || v <= 0) return
    onAddObservation(survey.id, stationId, targetId, v)
    setDistance('')
  }

  const resolution = useMemo(() => resolveTarget(observations, stations), [observations, stations])
  const point = area.points.find((p) => p.id === targetId)

  return (
    <div className="check-card">
      <div className="card-title"><h3>Target {targetId}</h3>{point && <span>{point.position.x}/{point.position.y}/{point.position.z} mm</span>}</div>
      {observations.length === 0 && <p className="muted">Brak odczytów.</p>}
      {observations.length > 0 && (
        <div className="session-list">
          {stations.map((s) => {
            const obs = byStation(s.id)
            return obs ? <div className="session-row" key={s.id}><span>{s.label ?? s.id}: {obs.distanceMm} mm</span></div> : null
          })}
        </div>
      )}

      <div className="wall-edit">
        <label>Stanowisko
          <select value={stationId} onChange={(e) => setStationId(e.target.value)}>
            {stations.map((s) => <option key={s.id} value={s.id}>{s.label ?? s.id}</option>)}
          </select>
        </label>
        <label>Odległość [mm]<input value={distance} onChange={(e) => setDistance(e.target.value)} inputMode="decimal" /></label>
        <button className="secondary wide" onClick={submit}>+ Dodaj odczyt</button>
      </div>

      {resolution && (
        <div className="wall-info-row">
          <span>Rozwiązanie</span>
          <strong>
            {resolution.kind === 'unique' && `(${Math.round(resolution.point.x)}, ${Math.round(resolution.point.y)}) mm`}
            {resolution.kind === 'resolved3' && `(${Math.round(resolution.point.x)}, ${Math.round(resolution.point.y)}) mm · residuum ${resolution.residualMm.toFixed(1)} mm${resolution.residualMm > RESIDUAL_WARN_MM ? ' · DO KONTROLI' : ''}`}
            {resolution.kind === 'ambiguous' && 'dwa rozwiązania — wybierz stronę'}
            {resolution.kind === 'none' && 'okręgi się nie przecinają — sprawdź odczyty/pozycje stanowisk'}
          </strong>
        </div>
      )}

      {resolution?.kind === 'ambiguous' && (
        <div className="section-tabs">
          <button className={pickedSide === 0 ? 'active' : ''} onClick={() => setPickedSide(0)}>Strona A ({Math.round(resolution.points[0].x)}, {Math.round(resolution.points[0].y)})</button>
          <button className={pickedSide === 1 ? 'active' : ''} onClick={() => setPickedSide(1)}>Strona B ({Math.round(resolution.points[1].x)}, {Math.round(resolution.points[1].y)})</button>
        </div>
      )}

      {(resolution?.kind === 'unique' || resolution?.kind === 'resolved3' || resolution?.kind === 'ambiguous') && (
        <button className="primary wide" onClick={() => {
          const p = resolution.kind === 'ambiguous' ? resolution.points[pickedSide] : resolution.point
          onApplyResolvedPoint(targetId, p.x, p.y, area.points.find((pt) => pt.id === targetId)?.position.z ?? 0)
        }}>Zastosuj do punktu {targetId}</button>
      )}
    </div>
  )
}

type Resolution =
  | { kind: 'none' }
  | { kind: 'unique'; point: Vec2 }
  | { kind: 'ambiguous'; points: [Vec2, Vec2] }
  | { kind: 'resolved3'; point: Vec2; residualMm: number }

function resolveTarget(observations: StationObservation[], stations: SurveyStation[]): Resolution | null {
  // Bierzemy tylko najnowszy odczyt per stanowisko - poprzednie zostają w historii,
  // ale rozwiazanie zawsze liczymy z aktualnej interpretacji, nie z pierwszego wpisu.
  const latestByStation = new Map<string, StationObservation>()
  for (const o of observations) latestByStation.set(o.stationId, o)
  const byStation = new Map(stations.map((s) => [s.id, s]))
  const withPos = Array.from(latestByStation.values())
    .map((o) => ({ obs: o, station: byStation.get(o.stationId) }))
    .filter((x): x is { obs: StationObservation; station: SurveyStation } => !!x.station)
  if (withPos.length < 2) return null

  const [first, second, third] = withPos
  const candidates = circleIntersections(
    { x: first.station.position.x, y: first.station.position.y }, first.obs.distanceMm,
    { x: second.station.position.x, y: second.station.position.y }, second.obs.distanceMm
  )
  if (candidates.length === 0) return { kind: 'none' }
  if (candidates.length === 1) return { kind: 'unique', point: candidates[0] }

  if (third) {
    const picked = pickByThirdStation(candidates, { x: third.station.position.x, y: third.station.position.y }, third.obs.distanceMm)
    if (picked) return { kind: 'resolved3', point: picked.point, residualMm: picked.residualMm }
  }
  return { kind: 'ambiguous', points: [candidates[0], candidates[1]] }
}
