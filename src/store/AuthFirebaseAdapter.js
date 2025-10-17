import { reactive } from 'vue'
import { upsertUser, findByEmail } from './userRegistry'
import { normEmail } from '@/utils/validation'
import { getFirebaseAuth, getGoogleProvider } from '@/utils/FirebaseClient'

const state = reactive({ user: null })

async function mirrorToLocal(firebaseUser) {
  if (!firebaseUser) return null
  const email = normEmail(firebaseUser.email)
  const name = firebaseUser.displayName || email.split('@')[0]
  const existing = findByEmail(email)

  const ensured = upsertUser({
    id: existing?.id,
    email,
    name,
    role: existing?.role || 'user',
    disabled: !!existing?.disabled,
    password: existing?.password || 'oauth',
    verified: firebaseUser.emailVerified,
    phone: existing?.phone || '',
  })

  try {
    const { getFirebaseDb } = await import('@/utils/FirebaseClient')
    const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore')
    const db = await getFirebaseDb()
    const ref = doc(db, 'users', firebaseUser.uid)

    const snap = await getDoc(ref)
    const phoneFromFs = snap.exists() ? snap.data().phone || '' : ''
    const phoneFinal = phoneFromFs || ensured.phone || ''

    await setDoc(
      ref,
      {
        name: ensured.name,
        email: ensured.email,
        phone: phoneFinal,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch {
    // ignore
  }

  state.user = { id: ensured.id, email: ensured.email, name: ensured.name, role: ensured.role }
  return state.user
}

async function mod() {
  const a = await getFirebaseAuth()
  const m = await import('firebase/auth')
  await m.setPersistence(a, m.browserLocalPersistence)
  return { a, m }
}

;(async () => {
  const { a, m } = await mod()
  try {
    const r = await m.getRedirectResult(a)
    if (r?.user) mirrorToLocal(r.user)
  } catch {
    //
  }
  m.onAuthStateChanged(a, (fbUser) => {
    if (fbUser) mirrorToLocal(fbUser)
    else state.user = null
  })
})()

function mapError(e) {
  const code = e?.code || ''
  if (code === 'auth/invalid-credential')
    return new Error(
      'Invalid credentials. Make sure this app is pointed at the SAME Firebase project where the account exists.',
    )
  if (code === 'auth/user-not-found') return new Error('User not found.')
  if (code === 'auth/wrong-password') return new Error('Wrong password.')
  if (code === 'auth/too-many-requests') return new Error('Too many attempts. Try again later.')
  if (code === 'auth/unauthorized-domain')
    return new Error(
      'Unauthorized domain. Add your domain under Authentication → Settings → Authorized domains.',
    )
  if (code === 'auth/operation-not-allowed')
    return new Error(
      'Email/Password or Google provider is disabled in Authentication → Sign-in method.',
    )
  return e
}

export const authFirebase = {
  state,
  currentUser() {
    return state.user
  },

  async register({ name, email, password, role = 'user' }) {
    const { a, m } = await mod()
    try {
      const cred = await m.createUserWithEmailAndPassword(a, email.trim(), password)
      if (name) await m.updateProfile(cred.user, { displayName: name })

      upsertUser({
        email: normEmail(email),
        name: name || email.split('@')[0],
        role,
        password: 'oauth',
        verified: cred.user.emailVerified,
        phone: '',
      })

      try {
        const { getFirebaseDb } = await import('@/utils/FirebaseClient')
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
        await setDoc(
          doc(await getFirebaseDb(), 'users', cred.user.uid),
          {
            name: name || email.split('@')[0],
            email: normEmail(email),
            phone: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      } catch {
        //
      }

      return { email }
    } catch (e) {
      throw mapError(e)
    }
  },

  async login({ email, password }) {
    const { a, m } = await mod()
    try {
      const result = await m.signInWithEmailAndPassword(a, email.trim(), password)
      return mirrorToLocal(result.user)
    } catch (e) {
      throw mapError(e)
    }
  },

  async loginWithGoogle() {
    const { a, m } = await mod()
    const provider = await getGoogleProvider()
    try {
      const res = await m.signInWithPopup(a, provider)
      return mirrorToLocal(res.user)
    } catch (e) {
      const code = e?.code || ''
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        await m.signInWithRedirect(a, provider)
        return
      }
      throw mapError(e)
    }
  },

  async resendVerification(email) {
    const { a, m } = await mod()
    if (a.currentUser && normEmail(a.currentUser.email) === normEmail(email)) {
      await m.sendEmailVerification(a.currentUser)
      return { email, alreadyVerified: a.currentUser.emailVerified }
    }
    return { email, alreadyVerified: false }
  },

  verifyEmail() {
    return { ok: true }
  },
  updateProfile({ email, name }) {
    const rec = findByEmail(email)
    if (rec) {
      const next = upsertUser({ ...rec, name: name || rec.name })
      if (state.user?.email === email) {
        state.user = { id: next.id, email: next.email, name: next.name, role: next.role }
      }
    }
  },
  async changePassword() {
    throw new Error('Change password through Firebase account settings.')
  },
  toggle2FA() {},
  async logout() {
    const { a, m } = await mod()
    await m.signOut(a)
  },
}
