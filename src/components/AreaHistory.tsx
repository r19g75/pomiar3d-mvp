import type { Area } from '../domain/model'

export function AreaHistory({ area }: { area: Area }) {
  const sessions = new Map(area.sessions.map((s) => [s.id, s]))
  return (
    <div className="list-card">
      <div className="card-title"><h2>Historia obszaru</h2><span>{area.history.length} zdarzeń</span></div>
      <div className="timeline">
        {area.history.length === 0 && <p>Brak historii.</p>}
        {area.history.slice().reverse().map((h) => (
          <div className="timeline-row" key={h.id}>
            <span className={`history-dot ${h.action}`} />
            <div><strong>{h.summary}</strong><small>{new Date(h.createdAt).toLocaleString('pl-PL')} · {h.sessionId ? sessions.get(h.sessionId)?.name ?? h.sessionId : 'bez sesji'}</small></div>
          </div>
        ))}
      </div>
    </div>
  )
}
