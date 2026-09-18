import { areaCompletion, areaMissingCount } from '../domain/geometry'
import type { Area, AreaKind, Project } from '../domain/model'

const kindLabel: Record<AreaKind, string> = { room: 'Pomieszczenie', terrace: 'Taras', stairs: 'Klatka schodowa', other: 'Inny obszar' }

export function ProjectOverview({ project, onOpen, onCreate }: { project: Project; onOpen: (area: Area) => void; onCreate: () => void }) {
  return (
    <div className="overview">
      <div className="overview-head">
        <div><div className="eyebrow dark">PROJEKT</div><h2>{project.name}</h2><p>Każdy obszar ma własną geometrię, sesje pomiarowe i historię zmian.</p></div>
        <button className="primary" onClick={onCreate}>+ Nowy obszar</button>
      </div>
      <div className="area-grid">
        {project.areas.map((area) => {
          const completion = areaCompletion(area)
          const missing = areaMissingCount(area)
          const lastSession = area.sessions.find((s) => s.id === area.activeSessionId) ?? area.sessions.at(-1)
          return (
            <button key={area.id} className="area-card" onClick={() => onOpen(area)}>
              <div className="area-card-top"><span className="area-kind">{kindLabel[area.kind]}</span><strong>{completion}%</strong></div>
              <h3>{area.name}</h3>
              <div className="progress"><span style={{ width: `${completion}%` }} /></div>
              <div className="area-meta"><span>{missing ? `${missing} braków` : 'bez wykrytych braków'}</span><span>{area.measurements.length} pomiarów</span></div>
              <small>Ostatnia sesja: {lastSession?.name ?? '—'} · {new Date(area.updatedAt).toLocaleString('pl-PL')}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}
