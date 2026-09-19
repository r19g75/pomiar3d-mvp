import { useState } from 'react'
import { areaCompletion, areaMissingCount } from '../domain/geometry'
import { isArchived, type Area, type AreaKind, type Project } from '../domain/model'

const kindLabel: Record<AreaKind, string> = { room: 'Pomieszczenie', terrace: 'Taras', stairs: 'Klatka schodowa', other: 'Inny obszar' }

export function ProjectOverview({ project, onOpen, onCreate, onArchive, onDelete }: {
  project: Project
  onOpen: (area: Area) => void
  onCreate: () => void
  onArchive: (areaId: string, archived: boolean) => void
  onDelete: (areaId: string) => void
}) {
  const [showArchived, setShowArchived] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const areas = project.areas.filter((a) => showArchived || !isArchived(a))

  return (
    <div className="overview">
      <div className="overview-head">
        <div><div className="eyebrow dark">PROJEKT</div><h2>{project.name}</h2><p>Każdy obszar ma własną geometrię, sesje pomiarowe i historię zmian.</p></div>
        <button className="primary" onClick={onCreate}>+ Nowy obszar</button>
      </div>
      <label className="archived-toggle"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Pokaż archiwalne</label>
      <div className="area-grid">
        {areas.map((area) => {
          const completion = areaCompletion(area)
          const missing = areaMissingCount(area)
          const lastSession = area.sessions.find((s) => s.id === area.activeSessionId) ?? area.sessions.at(-1)
          const archived = isArchived(area)
          return (
            <div key={area.id} className={archived ? 'area-card archived' : 'area-card'}>
              <button className="area-card-menu" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === area.id ? null : area.id) }}>⋮</button>
              {menuFor === area.id && (
                <div className="area-card-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { onArchive(area.id, !archived); setMenuFor(null) }}>{archived ? 'Przywróć' : 'Ukryj / Archiwizuj'}</button>
                  <button onClick={() => { onDelete(area.id); setMenuFor(null) }}>Usuń trwale</button>
                </div>
              )}
              <button className="area-card-body" onClick={() => onOpen(area)}>
                <div className="area-card-top"><span className="area-kind">{kindLabel[area.kind]}{archived ? ' · zarchiwizowane' : ''}</span><strong>{completion}%</strong></div>
                <h3>{area.name}</h3>
                <div className="progress"><span style={{ width: `${completion}%` }} /></div>
                <div className="area-meta"><span>{missing ? `${missing} braków` : 'bez wykrytych braków'}</span><span>{area.measurements.length} pomiarów</span></div>
                <small>Ostatnia sesja: {lastSession?.name ?? '—'} · {new Date(area.updatedAt).toLocaleString('pl-PL')}</small>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
