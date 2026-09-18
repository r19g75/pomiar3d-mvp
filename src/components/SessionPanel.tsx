import type { Area } from '../domain/model'

export function SessionPanel({ area, onNewSession, onSelect }: { area: Area; onNewSession: () => void; onSelect: (id: string) => void }) {
  return (
    <div className="list-card">
      <div className="card-title"><h2>Sesje pomiarowe</h2><button onClick={onNewSession}>+ Nowa sesja</button></div>
      <p className="muted">Możesz przerwać pracę, przejść do innego obszaru i później wrócić. Nowe pomiary trafiają do aktywnej sesji.</p>
      <div className="session-list">
        {area.sessions.slice().reverse().map((session) => {
          const count = area.measurements.filter((m) => m.sessionId === session.id).length
          const active = session.id === area.activeSessionId
          return <button className={`session-row ${active ? 'active' : ''}`} key={session.id} onClick={() => onSelect(session.id)}>
            <span><strong>{session.name}</strong><small>{new Date(session.startedAt).toLocaleString('pl-PL')}</small></span>
            <span>{count} pomiarów {active ? '· aktywna' : ''}</span>
          </button>
        })}
      </div>
    </div>
  )
}
