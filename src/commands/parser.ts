import type { Area, Project } from '../domain/model'
import { newId, nowIso } from '../domain/model'
import { addHistory, getActiveArea, withArea } from '../domain/operations'

const normalize = (s: string) => s.trim().replace(/,/g, '.').replace(/\s+/g, ' ')
const n = (value: string | undefined) => value === undefined ? NaN : Number(value)

export type CommandResult = { project: Project; message: string }

function updateActive(project: Project, updater: (area: Area) => Area) {
  const area = getActiveArea(project)
  return withArea(project, area.id, updater)
}

export function executeCommand(project: Project, input: string): CommandResult {
  const command = normalize(input)
  const parts = command.split(' ')
  const head = parts[0]?.toLocaleLowerCase('pl')
  const area = getActiveArea(project)

  if (head === 'punkt' || /^[a-z]*p?\d+$/i.test(parts[0] ?? '')) {
    const offset = head === 'punkt' ? 1 : 0
    const id = parts[offset]
    const x = n(parts[offset + 1]); const y = n(parts[offset + 2]); const z = n(parts[offset + 3])
    if (!id || [x, y, z].some(Number.isNaN)) throw new Error('Składnia: punkt P1 4826 0 0')
    const project2 = updateActive(project, (a) => {
      const points = [...a.points]
      const existing = points.findIndex((p) => p.id.toLocaleLowerCase() === id.toLocaleLowerCase())
      const point = { id, position: { x, y, z }, source: 'measured' as const, state: 'existing' as const }
      if (existing >= 0) points[existing] = point; else points.push(point)
      return addHistory({ ...a, points, activePointId: id }, {
        action: existing >= 0 ? 'updated' : 'created', entityType: 'point', entityId: id,
        summary: `${existing >= 0 ? 'Poprawiono' : 'Dodano'} ${id} = (${x}, ${y}, ${z}) mm`
      })
    })
    return { project: project2, message: `${id} = (${x}, ${y}, ${z}) mm` }
  }

  if (head === 'ściana' || head === 'sciana') {
    const [id, from, to] = [parts[1], parts[2], parts[3]]
    const heightMm = n(parts[4]); const thicknessMm = n(parts[5])
    if (!id || !from || !to || Number.isNaN(heightMm) || Number.isNaN(thicknessMm)) throw new Error('Składnia: ściana W01 P0 P1 2638 120')
    if (!area.points.some((p) => p.id === from) || !area.points.some((p) => p.id === to)) throw new Error('Najpierw utwórz oba punkty ściany')
    const project2 = updateActive(project, (a) => {
      const existed = a.walls.some((w) => w.id === id)
      const walls = a.walls.filter((w) => w.id !== id)
      walls.push({ id, from, to, heightMm, thicknessMm, status: 'measured', state: 'existing' })
      return addHistory({ ...a, walls }, {
        action: existed ? 'updated' : 'created', entityType: 'wall', entityId: id,
        summary: `${existed ? 'Poprawiono' : 'Dodano'} ścianę ${id}: ${from}–${to}, H=${heightMm} mm`
      })
    })
    return { project: project2, message: `Zapisano ścianę ${id}` }
  }

  if (head === 'pomiar') {
    const from = parts[1]; const to = parts[2]; const valueMm = n(parts[3])
    if (!from || !to || Number.isNaN(valueMm)) throw new Error('Składnia: pomiar P0 P1 4826')
    const id = newId('M')
    const project2 = updateActive(project, (a) => {
      const measurement = { id, kind: 'distance' as const, from, to, valueMm, source: 'voice' as const, createdAt: nowIso(), sessionId: a.activeSessionId }
      return addHistory({ ...a, measurements: [...a.measurements, measurement] }, {
        action: 'measured', entityType: 'measurement', entityId: id, summary: `${from}–${to} = ${valueMm} mm`
      })
    })
    return { project: project2, message: `Pomiar ${from}–${to}: ${valueMm} mm` }
  }

  if ((head === '+x' || head === '-x' || head === '+y' || head === '-y') && area.activePointId) {
    const distance = n(parts[1])
    if (!Number.isFinite(distance) || distance <= 0) throw new Error('Składnia: +x 4826')
    const start = area.points.find((p) => p.id === area.activePointId)
    if (!start) throw new Error('Nie znaleziono aktywnego punktu')
    const index = area.points.length
    let pointId = `P${index}`
    while (area.points.some((p) => p.id === pointId)) pointId = `P${Number(pointId.slice(1)) + 1}`
    const pos = { ...start.position }
    if (head.endsWith('x')) pos.x += head.startsWith('-') ? -distance : distance
    else pos.y += head.startsWith('-') ? -distance : distance
    const wallId = `W${String(area.walls.length + 1).padStart(2, '0')}`
    const measurementId = newId('M')
    const project2 = updateActive(project, (a) => {
      let updated: Area = {
        ...a,
        activePointId: pointId,
        points: [...a.points, { id: pointId, position: pos, source: 'measured', state: 'existing' }],
        walls: [...a.walls, { id: wallId, from: start.id, to: pointId, heightMm: 0, thicknessMm: 0, status: 'incomplete', state: 'existing', note: 'utworzone komendą względną; uzupełnij wysokość/grubość' }],
        measurements: [...a.measurements, { id: measurementId, kind: 'distance', from: start.id, to: pointId, valueMm: distance, source: 'quick_measure', createdAt: nowIso(), sessionId: a.activeSessionId }]
      }
      updated = addHistory(updated, { action: 'created', entityType: 'point', entityId: pointId, summary: `${head} ${distance}: utworzono ${pointId}` })
      updated = addHistory(updated, { action: 'created', entityType: 'wall', entityId: wallId, summary: `Utworzono niekompletną ścianę ${wallId}: ${start.id}–${pointId}` })
      return addHistory(updated, { action: 'measured', entityType: 'measurement', entityId: measurementId, summary: `${start.id}–${pointId} = ${distance} mm` })
    })
    return { project: project2, message: `${pointId} ${head} ${distance} mm; utworzono ${wallId}` }
  }

  throw new Error('Nieznane polecenie. Np.: punkt P4 1200 800 0 · pomiar P0 P1 4826 · +x 4826')
}
