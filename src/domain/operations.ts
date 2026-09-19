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

export function setAreaArchived(project: Project, areaId: string, archived: boolean): Project {
  const now = nowIso()
  return { ...project, updatedAt: now, areas: project.areas.map((a) => a.id === areaId ? { ...a, archived, updatedAt: now } : a) }
}

/** Trwale usuwa obszar i wszystkie jego dane; nie rusza pozostałych obszarów projektu. */
export function removeArea(project: Project, areaId: string): Project {
  const areas = project.areas.filter((a) => a.id !== areaId)
  const activeAreaId = project.activeAreaId === areaId ? areas[0]?.id : project.activeAreaId
  return { ...project, areas, activeAreaId, updatedAt: nowIso() }
}
