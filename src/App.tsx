import { useEffect, useMemo, useRef, useState } from 'react'
import { FloorPlan } from './components/FloorPlan'
import { SectionView } from './components/SectionView'
import { CommandBar } from './components/CommandBar'
import { ProjectOverview } from './components/ProjectOverview'
import { AreaHistory } from './components/AreaHistory'
import { SessionPanel } from './components/SessionPanel'
import { executeCommand } from './commands/parser'
import { downloadProject, readProjectFile } from './io/projectFile'
import { loadProject, saveProject } from './storage/db'
import { areaMissingCount } from './domain/geometry'
import { addHistory, withArea } from './domain/operations'
import { makeDemoProject, makeEmptyArea, newId, nowIso, type Area, type AreaKind, type Project } from './domain/model'
import './styles.css'

type Tab = 'plan' | 'sections' | 'measurements' | 'sessions' | 'history' | 'data'
type Screen = 'overview' | 'area'

export default function App() {
  const [project, setProject] = useState<Project>(makeDemoProject())
  const [screen, setScreen] = useState<Screen>('overview')
  const [tab, setTab] = useState<Tab>('plan')
  const [sectionId, setSectionId] = useState('')
  const [ready, setReady] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProject().then((saved) => {
      if (saved) setProject(saved)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => saveProject(project), 250)
    return () => window.clearTimeout(timer)
  }, [project, ready])

  const area = useMemo(() => project.areas.find((a) => a.id === project.activeAreaId) ?? project.areas[0], [project])
  const section = useMemo(() => area?.sections.find((s) => s.id === sectionId) ?? area?.sections[0], [area, sectionId])
  const missingCount = area ? areaMissingCount(area) : 0

  const openArea = (selected: Area) => {
    setProject((p) => ({ ...p, activeAreaId: selected.id, updatedAt: nowIso() }))
    setSectionId(selected.sections[0]?.id ?? '')
    setTab('plan')
    setScreen('area')
  }

  const updateArea = (updater: (area: Area) => Area) => {
    if (!area) return
    setProject((p) => withArea(p, area.id, updater))
  }

  const addArea = () => {
    const name = window.prompt('Nazwa obszaru, np. Taras albo Pokój poddasze')?.trim()
    if (!name) return
    const kindRaw = window.prompt('Typ: room / terrace / stairs / other', 'room')?.trim().toLowerCase() as AreaKind | undefined
    const kind: AreaKind = ['room', 'terrace', 'stairs', 'other'].includes(kindRaw ?? '') ? kindRaw! : 'other'
    const newArea = makeEmptyArea(name, kind)
    setProject((p) => ({ ...p, areas: [...p.areas, newArea], activeAreaId: newArea.id, updatedAt: nowIso() }))
    setSectionId('')
    setTab('plan')
    setScreen('area')
  }

  const addMeasurement = () => {
    if (!area) return
    const valueRaw = window.prompt('Wartość pomiaru [mm]')
    if (!valueRaw) return
    const valueMm = Number(valueRaw.replace(',', '.'))
    if (!Number.isFinite(valueMm)) return
    const note = window.prompt('Opis / czego dotyczy? (opcjonalnie)', '')?.trim() || undefined
    const id = newId('M')
    updateArea((a) => addHistory({ ...a, measurements: [...a.measurements, {
      id, kind: 'distance', valueMm, source: 'manual', createdAt: nowIso(), sessionId: a.activeSessionId, note
    }] }, { action: 'measured', entityType: 'measurement', entityId: id, summary: `${note ? `${note}: ` : ''}${valueMm} mm` }))
  }

  const addSession = () => {
    if (!area) return
    const defaultName = `Sesja ${area.sessions.length + 1}`
    const name = window.prompt('Nazwa sesji', defaultName)?.trim()
    if (!name) return
    const id = newId('S')
    updateArea((a) => addHistory({ ...a, activeSessionId: id, sessions: [...a.sessions, { id, name, startedAt: nowIso() }] }, {
      action: 'session', entityType: 'session', entityId: id, sessionId: id, summary: `Rozpoczęto sesję „${name}”`
    }))
  }

  const selectSession = (id: string) => updateArea((a) => ({ ...a, activeSessionId: id }))

  const fillMissing = (pointId: string, value: number) => {
    if (!section) return
    updateArea((a) => addHistory({
      ...a,
      sections: a.sections.map((s) => s.id !== section.id ? s : ({ ...s, points: s.points.map((sp) => sp.id === pointId ? { ...sp, zMm: value, measured: true } : sp) }))
    }, { action: 'measured', entityType: 'section', entityId: section.id, summary: `${section.name}: ${pointId}, Z=${value} mm` }))
  }

  return (
    <div className="app-shell">
      <header>
        <div className="header-title">
          {screen === 'area' && <button className="back" onClick={() => setScreen('overview')} aria-label="Wróć do obszarów">‹</button>}
          <div><div className="eyebrow">POMIAR 3D · OFFLINE FIRST</div><h1>{screen === 'area' && area ? area.name : project.name}</h1></div>
        </div>
        <div className="header-actions">
          {screen === 'area' && <span className={missingCount ? 'badge warn' : 'badge ok'}>{missingCount ? `${missingCount} braków` : 'bez braków'}</span>}
          <button className="secondary" onClick={() => downloadProject(project)}>Eksport</button>
          <button className="secondary" onClick={() => importRef.current?.click()}>Import</button>
          <input ref={importRef} type="file" hidden accept=".pomiar3d,application/json" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const imported = await readProjectFile(file)
              setProject(imported)
              setScreen('overview')
            } catch (err) { alert(err instanceof Error ? err.message : 'Błąd importu') }
            e.target.value = ''
          }} />
        </div>
      </header>

      {screen === 'overview' ? (
        <main><ProjectOverview project={project} onOpen={openArea} onCreate={addArea} /></main>
      ) : area ? (
        <>
          <nav>
            <button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>Rzut</button>
            <button className={tab === 'sections' ? 'active' : ''} onClick={() => setTab('sections')}>Przekroje</button>
            <button className={tab === 'measurements' ? 'active' : ''} onClick={() => setTab('measurements')}>Pomiary</button>
            <button className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}>Sesje</button>
            <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Historia</button>
            <button className={tab === 'data' ? 'active' : ''} onClick={() => setTab('data')}>Dane</button>
          </nav>

          <main>
            <div className="area-context"><span>Aktywna sesja:</span><strong>{area.sessions.find((s) => s.id === area.activeSessionId)?.name ?? 'brak'}</strong><span>·</span><span>{area.measurements.length} pomiarów</span></div>

            {tab === 'plan' && <>
              <FloorPlan area={area} onSection={(id) => { setSectionId(id); setTab('sections') }} />
              <button className="primary wide" onClick={addMeasurement}>+ Szybki pomiar</button>
            </>}

            {tab === 'sections' && (area.sections.length ? <>
              <div className="section-tabs">{area.sections.map((s) => <button key={s.id} className={s.id === section?.id ? 'active' : ''} onClick={() => setSectionId(s.id)}>{s.name} · {s.points.filter(p => p.measured && p.zMm !== null).length}/{s.points.length}</button>)}</div>
              {section && <SectionView section={section} onFillMissing={fillMissing} />}
            </> : <div className="empty-card"><h2>Brak przekrojów</h2><p>Ten obszar ma na razie tylko rzut. Przekroje dodamy w kolejnej iteracji edytora.</p></div>)}

            {tab === 'measurements' && <div className="list-card">
              <div className="card-title"><h2>Pomiary surowe</h2><button onClick={addMeasurement}>+ Dodaj</button></div>
              {area.measurements.length === 0 ? <p>Brak pomiarów.</p> : area.measurements.slice().reverse().map((m) => {
                const session = area.sessions.find((s) => s.id === m.sessionId)
                return <div className="measurement" key={m.id}><strong>{m.valueMm ?? '—'} mm</strong><span>{m.note ?? `${m.kind} · ${m.from ?? '—'} → ${m.to ?? '—'}`}</span><small>{m.source} · {session?.name ?? 'bez sesji'} · {new Date(m.createdAt).toLocaleString('pl-PL')}</small></div>
              })}
            </div>}

            {tab === 'sessions' && <SessionPanel area={area} onNewSession={addSession} onSelect={selectSession} />}
            {tab === 'history' && <AreaHistory area={area} />}
            {tab === 'data' && <div className="list-card"><h2>Dane obszaru</h2><p>Punkty: {area.points.length}</p><p>Ściany / odcinki: {area.walls.length}</p><p>Przekroje: {area.sections.length}</p><p>Pomiary: {area.measurements.length}</p><p>Sesje: {area.sessions.length}</p><p>Jednostki: mm</p><pre>{JSON.stringify(area, null, 2)}</pre></div>}
          </main>

          <CommandBar onExecute={(command) => {
            const result = executeCommand(project, command)
            setProject({ ...result.project, updatedAt: nowIso() })
            return result.message
          }} />
        </>
      ) : <main><div className="empty-card">Projekt nie zawiera obszarów.</div></main>}
    </div>
  )
}
