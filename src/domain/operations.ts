import { newId, nowIso, type Area, type HistoryEntry, type Project } from './model'

export function getActiveArea(project: Project): Area {
  const area = project.areas.find((a) => a.id === project.activeAreaId) ?? project.areas[0]
  if (!area) throw new Error('Projekt nie zawiera żadnego obszaru')
  return area
}

export function withArea(project: Project, areaId: string, updater: (area: Area) => Area): Project {
  const now = nowIso()
  return {
    ...project,
    updatedAt: now,
    areas: project.areas.map((area) => area.id === areaId ? { ...updater(area), updatedAt: now } : area)
  }
}

export function historyEntry(area: Area, data: Omit<HistoryEntry, 'id' | 'createdAt' | 'sessionId'> & { sessionId?: string }): HistoryEntry {
  return {
    id: newId('H'),
    createdAt: nowIso(),
    sessionId: data.sessionId ?? area.activeSessionId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    summary: data.summary
  }
}

export function addHistory(area: Area, entry: Omit<HistoryEntry, 'id' | 'createdAt' | 'sessionId'> & { sessionId?: string }): Area {
  return { ...area, history: [...area.history, historyEntry(area, entry)] }
}
