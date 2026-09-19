import { useMemo, useState } from 'react'
import type { Area, StationSurvey } from '../domain/model'
import { newId, nextElementId } from '../domain/model'
import { checkPointIntegrity } from '../domain/integrity'
import { baselineBetween, planTransfer, resolveInstrumentPositions, resolveTarget, targetStatus, type TargetResolution, type TransferItem } from '../domain/survey'
import { SketchCanvas, type SketchEdge, type SketchNode } from './SketchCanvas'

type AddMode = 'target' | 'instrument' | null

const RESOLUTION_LABEL: Record<TargetResolution['kind'], string> = {
  none: 'okręgi się nie przecinają',
  insufficient: 'potrzebny drugi odczyt',
  unique: 'rozwiązanie jednoznaczne',
  'sketch-picked': 'strona wybrana ze szkicu',
  ambiguous: 'dwa rozwiązania — wybierz',
  resolved3: 'rozstrzygnięte trzecim odczytem'
}

export function StationsPanel({ area, onCreateSurvey, onAddTarget, onAddInstrument, onMoveNode, onDeleteNode, onAddBaseline, onAddObservation, onAddEdge, onRestoreSurvey, onTransferToRzut, onRepairLabels, onRenameTarget, onSetTargetOrigin }: {
  area: Area
  onCreateSurvey: (name: string) => void
  onAddTarget: (surveyId: string, id: string, label: string, x: number, y: number) => void
  onAddInstrument: (surveyId: string, id: string, label: string, x: number, y: number) => void
  onMoveNode: (surveyId: string, kind: 'target' | 'instrument', nodeId: string, x: number, y: number) => void
  onDeleteNode: (surveyId: string, kind: 'target' | 'instrument', nodeId: string) => void
  onAddBaseline: (surveyId: string, fromInstrumentId: string, toInstrumentId: string, distanceMm: number) => void
  onAddObservation: (surveyId: string, instrumentPositionId: string, targetId: string, distanceMm: number) => void
  onAddEdge: (surveyId: string, from: string, to: string) => void
  onRestoreSurvey: (surveyId: string, snapshot: StationSurvey) => void
  onTransferToRzut: (surveyId: string, items: TransferItem[], withEdges: boolean) => void
  onRepairLabels: () => void
  onRenameTarget: (surveyId: string, targetId: string, newLabel: string) => string | undefined
  onSetTargetOrigin: (surveyId: string, targetId: string) => void
}) {
  const surveys = area.stationSurveys ?? []
  const survey = surveys[surveys.length - 1]
  const [surveyName, setSurveyName] = useState('Pomiar 1')
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [linkMode, setLinkMode] = useState(false)
  const [linkFrom, setLinkFrom] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'sketch' | 'result' | 'both'>('sketch')
  const [prevSnapshot, setPrevSnapshot] = useState<StationSurvey | null>(null)
  const [pendingBaselineTo, setPendingBaselineTo] = useState<string | null>(null)
  const [baselineValue, setBaselineValue] = useState('')
  const [obsInstrument, setObsInstrument] = useState('')
  const [obsValue, setObsValue] = useState('')
  const [baselineOtherId, setBaselineOtherId] = useState('')
  const [baselineEditValue, setBaselineEditValue] = useState('')
  const [transferEdges, setTransferEdges] = useState(false)
  const [labelError, setLabelError] = useState<string | null>(null)
  const [transferBlocked, setTransferBlocked] = useState<string | null>(null)
  const [transferSkipped, setTransferSkipped] = useState<string[] | null>(null)

  const integrityIssues = useMemo(() => checkPointIntegrity(area), [area])

  const resolvedInstruments = useMemo(() => survey ? resolveInstrumentPositions(survey) : new Map(), [survey])
  const resolutions = useMemo(() => {
    const map = new Map<string, TargetResolution>()
    if (survey) for (const t of survey.targets) map.set(t.id, resolveTarget(t, survey, resolvedInstruments))
    return map
  }, [survey, resolvedInstruments])

  if (!survey) {
    return (
      <div className="list-card">
        <div className="card-title"><h2>Stanowiska</h2></div>
        <p className="muted">Pomiar ze stanowisk: rysujesz orientacyjny szkic, stawiasz pozycje dalmierza D1/D2, wpisujesz same odległości — aplikacja liczy geometrię. Nie wymaga podawania współrzędnych X/Y/Z.</p>
        <div className="wall-edit">
          <label>Nazwa pomiaru<input value={surveyName} onChange={(e) => setSurveyName(e.target.value)} /></label>
          <button className="primary wide" onClick={() => onCreateSurvey(surveyName.trim() || 'Pomiar 1')}>Nowy pomiar ze stanowisk</button>
        </div>
      </div>
    )
  }

  const beforeMutate = () => setPrevSnapshot(survey)

  const startAdd = (mode: AddMode) => { beforeMutate(); setAddMode(mode); setLinkMode(false) }

  const handleAddNode = (x: number, y: number) => {
    if (addMode === 'target') {
      const id = newId('SPT')
      onAddTarget(survey.id, id, nextElementId(survey.targets.map((t) => t.label), 'P'), x, y)
    } else if (addMode === 'instrument') {
      const id = newId('SDI')
      const prev = survey.instrumentPositions[survey.instrumentPositions.length - 1]
      onAddInstrument(survey.id, id, nextElementId(survey.instrumentPositions.map((p) => p.label), 'D'), x, y)
      if (prev) { setPendingBaselineTo(id); setBaselineValue('') }
    }
    setAddMode(null)
  }

  const handleSelect = (id: string) => {
    if (linkMode) {
      if (linkFrom && linkFrom !== id) { beforeMutate(); onAddEdge(survey.id, linkFrom, id); setLinkFrom(null); setLinkMode(false) }
      else setLinkFrom(id)
      return
    }
    setSelectedId(id)
  }

  const handleMove = (id: string, x: number, y: number) => {
    const kind = survey.targets.some((t) => t.id === id) ? 'target' : 'instrument'
    onMoveNode(survey.id, kind, id, x, y)
  }

  const undo = () => { if (prevSnapshot) { onRestoreSurvey(survey.id, prevSnapshot); setPrevSnapshot(null) } }

  const deleteSelected = () => {
    if (!selectedId) return
    beforeMutate()
    const kind = survey.targets.some((t) => t.id === selectedId) ? 'target' : 'instrument'
    onDeleteNode(survey.id, kind, selectedId)
    setSelectedId(null)
  }

  const submitBaseline = () => {
    const v = Number(baselineValue.replace(',', '.'))
    if (!pendingBaselineTo || !Number.isFinite(v) || v <= 0) return
    const prev = survey.instrumentPositions[survey.instrumentPositions.length - 2]
    if (prev) onAddBaseline(survey.id, prev.id, pendingBaselineTo, v)
    setPendingBaselineTo(null)
  }

  const selectedTarget = survey.targets.find((t) => t.id === selectedId)
  const selectedInstrument = survey.instrumentPositions.find((p) => p.id === selectedId)

  const submitBaselineEdit = () => {
    if (!selectedInstrument || !baselineOtherId) return
    const v = Number(baselineEditValue.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) return
    beforeMutate()
    onAddBaseline(survey.id, selectedInstrument.id, baselineOtherId, v)
    setBaselineEditValue('')
  }

  const submitObservation = () => {
    if (!selectedTarget || !obsInstrument) return
    const v = Number(obsValue.replace(',', '.'))
    if (!Number.isFinite(v) || v <= 0) return
    beforeMutate()
    onAddObservation(survey.id, obsInstrument, selectedTarget.id, v)
    setObsValue('')
  }

  const sketchNodes: SketchNode[] = [
    ...survey.targets.map((t): SketchNode => ({ id: t.id, label: t.label, x: t.sketch.x, y: t.sketch.y, kind: 'target', status: targetStatus(resolutions.get(t.id) ?? { kind: 'none' }) })),
    ...survey.instrumentPositions.map((p): SketchNode => ({ id: p.id, label: p.label, x: p.sketch.x, y: p.sketch.y, kind: 'instrument' }))
  ]
  const sketchEdges: SketchEdge[] = survey.sketchEdges

  const resultBounds = (() => {
    const pts = [
      ...Array.from(resolvedInstruments.values()).map((p) => ({ x: p.x, y: p.y })),
      ...Array.from(resolutions.values()).flatMap((r) => r.kind === 'unique' || r.kind === 'sketch-picked' || r.kind === 'resolved3' ? [r.point] : r.kind === 'ambiguous' ? r.points : [])
    ]
    if (!pts.length) return null
    const minX = Math.min(...pts.map((p) => p.x)); const maxX = Math.max(...pts.map((p) => p.x))
    const minY = Math.min(...pts.map((p) => p.y)); const maxY = Math.max(...pts.map((p) => p.y))
    const span = Math.max(maxX - minX, maxY - minY, 1)
    const scale = 1600 / span
    return { minX, minY, scale }
  })()
  const toResultXY = (x: number, y: number) => resultBounds ? { x: (x - resultBounds.minX) * resultBounds.scale + 200, y: (y - resultBounds.minY) * resultBounds.scale + 200 } : { x: 1000, y: 1000 }

  const resultNodes: SketchNode[] = resultBounds ? [
    ...survey.instrumentPositions.map((p): SketchNode => { const rp = resolvedInstruments.get(p.id); const xy = rp ? toResultXY(rp.x, rp.y) : { x: 0, y: 0 }; return { id: p.id, label: p.label, x: xy.x, y: xy.y, kind: 'instrument' } }),
    ...survey.targets.filter((t) => {
      const r = resolutions.get(t.id)
      return r && (r.kind === 'unique' || r.kind === 'sketch-picked' || r.kind === 'resolved3')
    }).map((t): SketchNode => {
      const r = resolutions.get(t.id)!
      const point = r.kind === 'ambiguous' ? r.points[0] : (r as { point: { x: number; y: number } }).point
      const xy = toResultXY(point.x, point.y)
      return { id: t.id, label: t.label, x: xy.x, y: xy.y, kind: 'target', status: targetStatus(r) }
    })
  ] : []

  const doneCount = survey.targets.filter((t) => targetStatus(resolutions.get(t.id) ?? { kind: 'none' }) === 'done').length

  return (
    <div className="list-card">
      <div className="card-title"><h2>Stanowiska — {survey.name}</h2><span>{doneCount}/{survey.targets.length} punktów gotowych</span></div>
      <p className="muted"><small>Szkic orientacyjny — proporcje nie muszą być dokładne. Stanowisko/pozycja dalmierza oznacza jego punkt odniesienia; przy obrocie powinien pozostawać możliwie stały.</small></p>

      {integrityIssues.length > 0 && (
        <div className="wall-edit warn-card">
          <strong>Problemy z etykietami punktów na Rzucie:</strong>
          {integrityIssues.map((i, idx) => <div key={idx}>{i.message}</div>)}
          <button className="secondary wide" onClick={onRepairLabels}>Napraw etykiety punktów</button>
        </div>
      )}

      <div className="section-tabs">
        <button className={view === 'sketch' ? 'active' : ''} onClick={() => setView('sketch')}>Szkic</button>
        <button className={view === 'result' ? 'active' : ''} onClick={() => setView('result')}>Wynik</button>
        <button className={view === 'both' ? 'active' : ''} onClick={() => setView('both')}>Oba</button>
      </div>

      <div className="section-tabs">
        <button className={addMode === 'target' ? 'active' : ''} onClick={() => startAdd('target')}>+ Punkt</button>
        <button className={addMode === 'instrument' ? 'active' : ''} onClick={() => startAdd('instrument')}>+ Pozycja dalmierza</button>
        <button className={linkMode ? 'active' : ''} onClick={() => { setLinkMode((v) => !v); setLinkFrom(null); setAddMode(null) }}>Łącz punkty</button>
        <button disabled={!prevSnapshot} onClick={undo}>Cofnij</button>
        <button disabled={!selectedId} onClick={deleteSelected}>Usuń zaznaczony</button>
      </div>

      {(view === 'sketch' || view === 'both') && (
        <SketchCanvas nodes={sketchNodes} edges={sketchEdges} selectedId={selectedId ?? undefined} addMode={addMode !== null} onAddNode={handleAddNode} onSelectNode={handleSelect} onMoveNode={handleMove} />
      )}
      {(view === 'result' || view === 'both') && (
        <SketchCanvas nodes={resultNodes} edges={[]} addMode={false} onAddNode={() => {}} onSelectNode={() => {}} onMoveNode={() => {}} />
      )}

      {pendingBaselineTo && (
        <div className="wall-edit">
          <label>Baza {survey.instrumentPositions[survey.instrumentPositions.length - 2]?.label} — {survey.instrumentPositions[survey.instrumentPositions.length - 1]?.label} [mm]
            <input value={baselineValue} onChange={(e) => setBaselineValue(e.target.value)} inputMode="decimal" autoFocus />
          </label>
          <small>Rzeczywista zmierzona odległość między punktami odniesienia dalmierza — nie „w przybliżeniu”.</small>
          <button className="primary wide" onClick={submitBaseline}>Zapisz bazę</button>
        </div>
      )}

      {selectedTarget && (
        <div className="bottom-sheet">
          <div className="bottom-sheet-head">
            <h3>{selectedTarget.label}</h3>
            <span>{RESOLUTION_LABEL[(resolutions.get(selectedTarget.id) ?? { kind: 'none' }).kind]}</span>
            <button className="secondary" onClick={() => setSelectedId(null)}>Zamknij</button>
          </div>
          <div className="wall-edit">
            <label>Etykieta
              <input
                key={selectedTarget.id}
                defaultValue={selectedTarget.label}
                onChange={() => setLabelError(null)}
                onBlur={(e) => {
                  if (e.target.value === selectedTarget.label) return
                  const err = onRenameTarget(survey.id, selectedTarget.id, e.target.value)
                  setLabelError(err ?? null)
                }}
              />
            </label>
            {labelError && <div className="error-text">{labelError}</div>}
            {selectedTarget.label !== 'P0' && <button className="secondary wide" onClick={() => onSetTargetOrigin(survey.id, selectedTarget.id)}>Ustaw jako P0</button>}
          </div>
          {survey.instrumentPositions.length === 0 && <p className="muted">Dodaj najpierw pozycję dalmierza.</p>}
          <div className="session-list">
            {survey.instrumentPositions.map((p) => {
              const obs = [...survey.observations].reverse().find((o) => o.instrumentPositionId === p.id && o.targetId === selectedTarget.id)
              return <div className="session-row" key={p.id}><span>{p.label}</span><span>{obs ? `${obs.distanceMm} mm` : '—'}</span></div>
            })}
          </div>
          {survey.instrumentPositions.length > 0 && (
            <div className="wall-edit">
              <label>Pozycja dalmierza
                <select value={obsInstrument} onChange={(e) => setObsInstrument(e.target.value)}>
                  <option value="">wybierz…</option>
                  {survey.instrumentPositions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
              <label>Odległość [mm]<input value={obsValue} onChange={(e) => setObsValue(e.target.value)} inputMode="decimal" /></label>
              <button className="primary wide" onClick={submitObservation}>+ Zapisz odczyt</button>
            </div>
          )}
          {(() => {
            const r = resolutions.get(selectedTarget.id)
            if (r?.kind === 'resolved3') return <div className="wall-info-row"><span>Residuum</span><strong>{r.residualMm.toFixed(1)} mm</strong></div>
            return null
          })()}
          <button className="secondary wide" onClick={deleteSelected}>Usuń punkt</button>
        </div>
      )}

      {selectedInstrument && !selectedTarget && (
        <div className="bottom-sheet">
          <div className="bottom-sheet-head"><h3>{selectedInstrument.label}</h3><button className="secondary" onClick={() => setSelectedId(null)}>Zamknij</button></div>
          <div className="wall-info-row"><span>Pozycja rozwiązana</span><strong>{resolvedInstruments.get(selectedInstrument.id) ? `${Math.round(resolvedInstruments.get(selectedInstrument.id)!.x)}, ${Math.round(resolvedInstruments.get(selectedInstrument.id)!.y)} mm` : 'brak bazy'}</strong></div>
          {survey.instrumentPositions.length > 1 && (
            <>
              <div className="session-list">
                {survey.instrumentPositions.filter((p) => p.id !== selectedInstrument.id).map((p) => {
                  const dist = baselineBetween(survey, selectedInstrument.id, p.id)
                  return <div className="session-row" key={p.id}><span>{p.label}</span><span>{dist ? `${dist} mm` : '—'}</span></div>
                })}
              </div>
              <div className="wall-edit">
                <label>Baza do pozycji
                  <select value={baselineOtherId} onChange={(e) => setBaselineOtherId(e.target.value)}>
                    <option value="">wybierz…</option>
                    {survey.instrumentPositions.filter((p) => p.id !== selectedInstrument.id).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </label>
                <label>Odległość [mm]<input value={baselineEditValue} onChange={(e) => setBaselineEditValue(e.target.value)} inputMode="decimal" /></label>
                <button className="primary wide" onClick={submitBaselineEdit}>Zapisz bazę</button>
              </div>
            </>
          )}
          <button className="secondary wide" onClick={deleteSelected}>Usuń pozycję</button>
        </div>
      )}

      <div className="wall-edit">
        <label><input type="checkbox" checked={transferEdges} onChange={(e) => setTransferEdges(e.target.checked)} /> też jako odcinki (niekompletne ściany)</label>
        {transferBlocked && <div className="error-text">{transferBlocked}</div>}
        {transferSkipped && transferSkipped.length > 0 && <div className="error-text">Pominięto (kolizja etykiety): {transferSkipped.join(', ')}</div>}
        <button
          className="primary wide"
          disabled={doneCount === 0}
          onClick={() => {
            const plan = planTransfer(area, survey, resolutions)
            if (!plan.ok) { setTransferBlocked(plan.reason); setTransferSkipped(null); return }
            setTransferBlocked(null)
            setTransferSkipped(plan.conflicts.length ? plan.conflicts : null)
            if (plan.items.length) onTransferToRzut(survey.id, plan.items, transferEdges)
          }}
        >Przenieś rozwiązane punkty na Rzut</button>
      </div>
    </div>
  )
}
