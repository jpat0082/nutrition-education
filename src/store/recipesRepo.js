const useFirebase =
  String(import.meta.env.VITE_USE_FIREBASE || '')
    .trim()
    .toLowerCase() === '1' ||
  String(import.meta.env.VITE_USE_FIREBASE || '')
    .trim()
    .toLowerCase() === 'true'

export function isFirebaseMode() {
  return useFirebase
}

const LS_KEY = 'ph_admin_recipes'
let localRows = loadLocal()
let localListeners = new Set()

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}
function saveLocal(rows) {
  localRows = Array.isArray(rows) ? rows : []
  localStorage.setItem(LS_KEY, JSON.stringify(localRows))
  for (const cb of localListeners) cb([...localRows])
}

async function fs() {
  const mod = await import('firebase/firestore')
  const { getFirebaseApp } = await import('@/utils/FirebaseClient')
  const db = mod.getFirestore(await getFirebaseApp())
  return { ...mod, db }
}

async function ensureRecipeCounter(mod) {
  const { db, doc, getDoc, setDoc, collection, getDocs } = mod
  const ctrRef = doc(db, 'meta', 'counters')
  const snap = await getDoc(ctrRef)
  if (snap.exists()) return

  let maxId = 0
  const snapAll = await getDocs(collection(db, 'recipes'))
  snapAll.forEach((d) => {
    const n = Number(d.id)
    if (Number.isFinite(n)) maxId = Math.max(maxId, n)
  })
  await setDoc(ctrRef, { recipes: maxId }, { merge: true })
}

async function allocRecipeId() {
  const mod = await fs()
  await ensureRecipeCounter(mod)
  const { db, doc, runTransaction } = mod
  const ctrRef = doc(db, 'meta', 'counters')
  const id = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ctrRef)
    const cur = Number(snap.data()?.recipes || 0)
    const next = cur + 1
    tx.set(ctrRef, { recipes: next }, { merge: true })
    return String(next)
  })
  return id
}

export async function listenRecipes(cb) {
  if (!useFirebase) {
    localListeners.add(cb)
    cb([...localRows])
    return () => localListeners.delete(cb)
  }
  const { db, collection, onSnapshot, query, orderBy } = await fs()
  const q = query(collection(db, 'recipes'), orderBy('title'))
  const unsub = onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    cb(rows)
  })
  return unsub
}

export async function upsertRecipe(rec) {
  const clean = {
    title: String(rec.title || ''),
    minutes: Number(rec.minutes || 0),
    tags: Array.isArray(rec.tags) ? rec.tags.map(String) : [],
    ingredients: Array.isArray(rec.ingredients) ? rec.ingredients.map(String) : [],
    instructions: String(rec.instructions || ''),
    status: rec.status || 'pending',
  }

  if (!useFirebase) {
    const id = rec.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const next = { id, ...clean }
    const idx = localRows.findIndex((r) => r.id === id)
    if (idx >= 0) localRows[idx] = next
    else localRows.unshift(next)
    saveLocal(localRows)
    return next
  }

  const { db, doc, setDoc } = await fs()
  const id = rec.id ? String(rec.id) : await allocRecipeId()
  await setDoc(doc(db, 'recipes', id), clean, { merge: true })
  return { id, ...clean }
}

export async function deleteRecipe(id) {
  if (!useFirebase) {
    saveLocal(localRows.filter((r) => r.id !== id))
    return
  }
  const { db, doc, deleteDoc } = await fs()
  await deleteDoc(doc(db, 'recipes', String(id)))
}

export async function replaceAll(recipes) {
  if (!useFirebase) {
    const mapped = (recipes || []).map((r) => ({
      id: r.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: String(r.title || ''),
      minutes: Number(r.minutes || 0),
      tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
      instructions: String(r.instructions || ''),
      status: 'approved',
    }))
    saveLocal(mapped)
    return
  }

  const mod = await fs()
  await ensureRecipeCounter(mod)
  const { db, writeBatch, doc } = mod
  const batch = writeBatch(db)
  for (const r of recipes || []) {
    const id = r.id ? String(r.id) : await allocRecipeId()
    batch.set(doc(db, 'recipes', id), {
      title: r.title || '',
      minutes: Number(r.minutes || 0),
      tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
      instructions: r.instructions || '',
      status: r.status || 'approved',
    })
  }
  await batch.commit()
}
