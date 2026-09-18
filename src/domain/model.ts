export type Id = string

export type Vec3 = { x: number; y: number; z: number }
export type GeometrySource = 'measured' | 'derived'
export type ElementState = 'existing' | 'reconstructed' | 'proposed'
export type Completeness = 'measured' | 'derived' | 'incomplete'
export type AreaKind = 'room' | 'terrace' | 'stairs' | 'other'

export type Point3D = {
  id: Id
  label?: string
  position: Vec3
  source: GeometrySource
  state?: ElementState
}

export type Wall = {
  id: Id
  from: Id
  to: Id
  heightMm: number
  thicknessMm: number
  /** Strona, w którą odkłada się grubość od linii P0->P1 (widok z góry, w prawo od wektora ruchu = 1). Domyślnie 1 dla starych plików. */
  thicknessSide?: 1 | -1
  status: Completeness
  state?: ElementState
  note?: string
}

export type ShapeKind = 'rectangle' | 'circle'

export type Shape = {
  id: Id
  kind: ShapeKind
  center: Vec3
  widthMm?: number
  depthMm?: number
  rotationDeg?: number
  diameterMm?: number
  heightMm: number
  status: Completeness
  state?: ElementState
  note?: string
}

export type SurveyStation = {
  id: Id
  label?: string
  position: Vec3
  source: 'manual' | 'derived'
}

export type StationObservation = {
  id: Id
  stationId: Id
  targetPointId: Id
  distanceMm: number
  source: 'manual' | 'voice' | 'bluetooth'
  createdAt: string
  sessionId?: Id
}

export type StationSurvey = {
  id: Id
  name: string
  plane: 'xy' | 'xz' | 'yz'
  stationIds: Id[]
  targetOrder: Id[]
  observations: StationObservation[]
  closedOutline?: boolean
}

export type SectionPoint = {
  id: Id
  offsetMm: number
  zMm: number | null
  measured: boolean
  note?: string
}

export type Section = {
  id: Id
  name: string
  axis: 'x' | 'y' | 'custom'
  stationMm: number
  lookDirection: 1 | -1
  points: SectionPoint[]
}

export type Measurement = {
  id: Id
  kind: 'distance' | 'height' | 'diagonal' | 'note'
  from?: Id
  to?: Id
  sectionId?: Id
  sectionPointId?: Id
  valueMm?: number
  source: 'manual' | 'voice' | 'bluetooth' | 'quick_measure'
  createdAt: string
  sessionId?: Id
  note?: string
  supersedesMeasurementId?: Id
}

export type MeasurementSession = {
  id: Id
  name: string
  startedAt: string
  endedAt?: string
  note?: string
}

export type HistoryEntry = {
  id: Id
  createdAt: string
  sessionId?: Id
  action: 'created' | 'updated' | 'measured' | 'session' | 'imported'
  entityType: 'area' | 'point' | 'wall' | 'shape' | 'section' | 'measurement' | 'session' | 'project' | 'station' | 'survey'
  entityId?: Id
  summary: string
}

export type Area = {
  id: Id
  name: string
  kind: AreaKind
  note?: string
  createdAt: string
  updatedAt: string
  activePointId?: Id
  activeSessionId?: Id
  points: Point3D[]
  walls: Wall[]
  shapes: Shape[]
  sections: Section[]
  measurements: Measurement[]
  sessions: MeasurementSession[]
  history: HistoryEntry[]
  stations?: SurveyStation[]
  stationSurveys?: StationSurvey[]
}

export type Project = {
  format: 'pomiar3d'
  version: 1
  id: Id
  name: string
  units: 'mm'
  createdAt: string
  updatedAt: string
  activeAreaId?: Id
  areas: Area[]
}

export const nowIso = () => new Date().toISOString()
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

export function nextElementId(existingIds: string[], prefix: string): string {
  let max = -1
  for (const id of existingIds) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${max + 1}`
}

export function makeEmptyArea(name: string, kind: AreaKind = 'room'): Area {
  const now = nowIso()
  const sessionId = newId('S')
  return {
    id: newId('A'),
    name,
    kind,
    createdAt: now,
    updatedAt: now,
    activePointId: 'P0',
    activeSessionId: sessionId,
    points: [{ id: 'P0', position: { x: 0, y: 0, z: 0 }, source: 'measured', state: 'existing' }],
    walls: [],
    shapes: [],
    sections: [],
    measurements: [],
    sessions: [{ id: sessionId, name: 'Sesja 1', startedAt: now }],
    history: [{ id: newId('H'), createdAt: now, sessionId, action: 'created', entityType: 'area', summary: `Utworzono obszar „${name}”` }]
  }
}

export function makeDemoProject(): Project {
  const now = nowIso()
  const roomSession = 'S_ROOM_1'
  const terraceSession = 'S_TERRACE_1'

  const room: Area = {
    id: 'A_ROOM',
    name: 'Pokój poddasze',
    kind: 'room',
    createdAt: now,
    updatedAt: now,
    activePointId: 'P0',
    activeSessionId: roomSession,
    points: [
      { id: 'P0', position: { x: 0, y: 0, z: 0 }, source: 'measured', state: 'existing' },
      { id: 'P1', position: { x: 4826, y: 0, z: 0 }, source: 'measured', state: 'existing' },
      { id: 'P2', position: { x: 4826, y: 3174, z: 0 }, source: 'measured', state: 'existing' },
      { id: 'P3', position: { x: 0, y: 3174, z: 0 }, source: 'derived', state: 'existing' }
    ],
    walls: [
      { id: 'W01', from: 'P0', to: 'P1', heightMm: 2638, thicknessMm: 120, status: 'measured', state: 'existing' },
      { id: 'W02', from: 'P1', to: 'P2', heightMm: 2638, thicknessMm: 120, status: 'measured', state: 'existing' },
      { id: 'W03', from: 'P2', to: 'P3', heightMm: 2638, thicknessMm: 120, status: 'derived', state: 'existing' },
      { id: 'W04', from: 'P3', to: 'P0', heightMm: 2638, thicknessMm: 120, status: 'incomplete', state: 'existing' }
    ],
    shapes: [
      { id: 'R01', kind: 'rectangle', center: { x: 2413, y: 1587, z: 0 }, widthMm: 200, depthMm: 200, rotationDeg: 0, heightMm: 2638, status: 'measured', state: 'existing', note: 'słupek konstrukcyjny' }
    ],
    sections: [
      {
        id: 'AA', name: 'A–A', axis: 'y', stationMm: 1800, lookDirection: 1,
        points: [
          { id: 'AA1', offsetMm: 0, zMm: 1120, measured: true, note: 'ściana kolankowa' },
          { id: 'AA2', offsetMm: 900, zMm: 1575, measured: true, note: 'połać' },
          { id: 'AA3', offsetMm: 1800, zMm: 2030, measured: true, note: 'połać' },
          { id: 'AA4', offsetMm: 2780, zMm: 2638, measured: true, note: 'sufit' },
          { id: 'AA5', offsetMm: 4210, zMm: null, measured: false, note: 'brak wysokości' }
        ]
      },
      {
        id: 'BB', name: 'B–B', axis: 'x', stationMm: 1550, lookDirection: -1,
        points: [
          { id: 'BB1', offsetMm: 0, zMm: 0, measured: true },
          { id: 'BB2', offsetMm: 4826, zMm: 0, measured: true },
          { id: 'BB3', offsetMm: 0, zMm: 2638, measured: true },
          { id: 'BB4', offsetMm: 4826, zMm: 2638, measured: true }
        ]
      }
    ],
    measurements: [{ id: 'M001', kind: 'distance', from: 'P0', to: 'P1', valueMm: 4826, source: 'manual', createdAt: now, sessionId: roomSession }],
    sessions: [{ id: roomSession, name: 'Pomiar początkowy', startedAt: now }],
    history: [
      { id: 'H_ROOM_1', createdAt: now, sessionId: roomSession, action: 'created', entityType: 'area', summary: 'Utworzono pomiar pokoju poddasza' },
      { id: 'H_ROOM_2', createdAt: now, sessionId: roomSession, action: 'measured', entityType: 'measurement', entityId: 'M001', summary: 'P0–P1 = 4826 mm' }
    ]
  }

  const terrace: Area = {
    id: 'A_TERRACE',
    name: 'Taras',
    kind: 'terrace',
    createdAt: now,
    updatedAt: now,
    activePointId: 'T0',
    activeSessionId: terraceSession,
    points: [
      { id: 'T0', position: { x: 0, y: 0, z: 0 }, source: 'measured', state: 'existing' },
      { id: 'T1', position: { x: 4200, y: 0, z: 0 }, source: 'measured', state: 'existing' },
      { id: 'T2', position: { x: 4200, y: 2800, z: 0 }, source: 'measured', state: 'existing' },
      { id: 'T3', position: { x: 0, y: 2800, z: 0 }, source: 'measured', state: 'existing' }
    ],
    walls: [
      { id: 'B01', from: 'T0', to: 'T1', heightMm: 1050, thicknessMm: 40, status: 'measured', state: 'existing', note: 'istniejąca barierka' },
      { id: 'B02', from: 'T1', to: 'T2', heightMm: 1050, thicknessMm: 40, status: 'incomplete', state: 'reconstructed', note: 'brakujący odcinek do odtworzenia' },
      { id: 'B03', from: 'T2', to: 'T3', heightMm: 1050, thicknessMm: 40, status: 'derived', state: 'reconstructed', note: 'odtwarzany z istniejącego szkieletu' }
    ],
    shapes: [],
    sections: [],
    measurements: [{ id: 'TM01', kind: 'distance', from: 'T0', to: 'T1', valueMm: 4200, source: 'manual', createdAt: now, sessionId: terraceSession }],
    sessions: [{ id: terraceSession, name: 'Szkielet tarasu', startedAt: now }],
    history: [{ id: 'HT01', createdAt: now, sessionId: terraceSession, action: 'created', entityType: 'area', summary: 'Rozpoczęto inwentaryzację tarasu' }]
  }

  return {
    format: 'pomiar3d', version: 1, id: 'projekt_demo', name: 'Projekt demonstracyjny', units: 'mm',
    createdAt: now, updatedAt: now, activeAreaId: room.id, areas: [room, terrace]
  }
}
