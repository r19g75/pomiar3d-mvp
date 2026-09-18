import { openDB } from 'idb'
import type { Project } from '../domain/model'
import { validateProject } from '../io/projectFile'

const DB_NAME = 'pomiar3d-db'
const STORE = 'projects'
const ACTIVE_PROJECT_KEY = 'pomiar3d-active-project-id'
const FALLBACK_PROJECT_ID = 'projekt_demo'

async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' })
    }
  })
}

export async function saveProject(project: Project) {
  const database = await db()
  await database.put(STORE, { ...project, updatedAt: new Date().toISOString() })
  localStorage.setItem(ACTIVE_PROJECT_KEY, project.id)
}

export async function loadProject(id?: string): Promise<Project | undefined> {
  const database = await db()
  const targetId = id ?? localStorage.getItem(ACTIVE_PROJECT_KEY) ?? FALLBACK_PROJECT_ID
  const raw = await database.get(STORE, targetId)
  if (!raw) return undefined
  try { return validateProject(raw) }
  catch {
    // Never destroy locally stored data merely because a migration fails.
    return undefined
  }
}
