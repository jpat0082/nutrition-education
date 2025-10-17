let app

function must(v, name) {
  if (!v || String(v).trim() === '') {
    throw new Error(`[Firebase config] Missing ${name}. Check your .env`)
  }
  return v
}

export async function getFirebaseApp() {
  if (app) return app
  const { initializeApp, getApps } = await import('firebase/app')
  const cfg = {
    apiKey: must(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
    authDomain: must(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: must(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID'),
    appId: must(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  }
  const apps = getApps()
  app = apps.length ? apps[0] : initializeApp(cfg)
  return app
}

export async function getFirebaseAuth() {
  const { getAuth } = await import('firebase/auth')
  return getAuth(await getFirebaseApp())
}

export async function getGoogleProvider() {
  const { GoogleAuthProvider } = await import('firebase/auth')
  const p = new GoogleAuthProvider()
  p.setCustomParameters({ prompt: 'select_account' })
  return p
}

export async function googleProvider() {
  return getGoogleProvider()
}

export async function getFirebaseDb() {
  const { getFirestore } = await import('firebase/firestore')
  return getFirestore(await getFirebaseApp())
}

export async function getFirebaseFunctions() {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const region = (import.meta.env.VITE_FIREBASE_REGION || 'us-central1').trim() || 'us-central1'
  const fn = getFunctions(await getFirebaseApp(), region)
  return { fn, httpsCallable }
}

if (
  typeof window !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
) {
  const { connectFirestoreEmulator } = await import('firebase/firestore')
  const { connectFunctionsEmulator } = await import('firebase/functions')

  const db = await getFirebaseDb()
  const { fn } = await getFirebaseFunctions()
  connectFirestoreEmulator(db, '127.0.0.1', 8081)
  connectFunctionsEmulator(fn, '127.0.0.1', 5002)
}
