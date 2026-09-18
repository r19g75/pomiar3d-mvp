import { newId, nowIso, type Area, type Project } from '../domain/model'

type LegacyProject = {
  format: 'pomiar3d'; version: 1; id: string; name: string; units: 'mm'; updatedAt: string
  points: Area['points']; walls: Area['walls']; sections: Area['sections']; measurements: Area['measurements']; activePointId?: string
}

function isObject(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' }

function migrateLegacy(p: LegacyProject): Project {
  const createdAt = p.updatedAt || nowIso()
  const sessionId = newId('S')
  const area: Area = {
    id: newId('A'), name: p.name || 'Obszar po imporcie', kind: 'room', createdAt, updatedAt: p.updatedAt || createdAt,
    activePointId: p.activePointId, activeSessionId: sessionId,
    points: p.points ?? [], walls: p.walls ?? [], sections: p.sections ?? [],
    measurements: (p.measurements ?? []).map((m) => ({ ...m, sessionId: m.sessionId ?? sessionId })),
    sessions: [{ id: sessionId, name: 'Import starego projektu', startedAt: createdAt }],
    history: [{ id: newId('H'), createdAt: nowIso(), sessionId, action: 'imported', entityType: 'project', summary: 'Zaimportowano starszy płaski format Pomiar 3D' }]
  }
  return { format: 'pomiar3d', version: 1, id: p.id, name: p.name, units: 'mm', createdAt, updatedAt: nowIso(), activeAreaId: area.id, areas: [area] }
}

export function validateProject(value: unknown): Project {
  if (!isObject(value)) throw new Error('Nieprawidłowy plik projektu')
  if (value.format !== 'pomiar3d' || value.version !== 1 || value.units !== 'mm') throw new Error('Nieobsługiwany format lub wersja pliku')

  if (Array.isArray(value.areas)) {
    if (typeof value.id !== 'string' || typeof value.name !== 'string') throw new Error('Brak identyfikatora lub nazwy projektu')
    for (const a of value.areas) {
      if (!isObject(a) || typeof a.id !== 'string' || typeof a.name !== 'string') throw new Error('Nieprawidłowy obszar w projekcie')
      if (!Array.isArray(a.points) || !Array.isArray(a.walls) || !Array.isArray(a.sections) || !Array.isArray(a.measurements)) throw new Error(`Brak danych obszaru ${a.name}`)
    }
    return value as unknown as Project
  }

  if (Array.isArray(value.points) && Array.isArray(value.walls) && Array.isArray(value.sections) && Array.isArray(value.measurements)) {
    return migrateLegacy(value as unknown as LegacyProject)
  }

  throw new Error('Brak wymaganych danych projektu')
}

export function downloadProject(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/[^a-z0-9-_]+/gi, '_')}.pomiar3d`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readProjectFile(file: File): Promise<Project> {
  return validateProject(JSON.parse(await file.text()))
}
