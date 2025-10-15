let app
export async function getFirebaseApp() {
  if (app) return app
  const { initializeApp, getApps } = await import('firebase/app')
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  }
  app = getApps().length ? getApps()[0] : initializeApp(cfg)
  return app
}
export async function getFirebaseAuth() {
  const { getAuth } = await import('firebase/auth')
  return getAuth(await getFirebaseApp())
}
export async function getGoogleProvider() {
  const { GoogleAuthProvider } = await import('firebase/auth')
  return new GoogleAuthProvider()
}
