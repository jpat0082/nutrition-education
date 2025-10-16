import { reactive } from 'vue'
import { upsertUser, findByEmail } from './userRegistry'
import { normEmail } from '@/utils/validation'
import { getFirebaseAuth, getGoogleProvider } from '@/utils/FirebaseClient'

const state = reactive({ user: null })

function mirrorToLocal(firebaseUser) {
  if (!firebaseUser) return null
  const email = normEmail(firebaseUser.email)
  const name = firebaseUser.displayName || email.split('@')[0]
  const rec = findByEmail(email)
  const ensured = upsertUser({
    id: rec?.id,
    email,
    name,
    role: rec?.role || 'user',
    disabled: !!rec?.disabled,
    password: rec?.password || 'oauth',
    verified: firebaseUser.emailVerified,
  })
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
    // ignore
  }
  m.onAuthStateChanged(a, (fbUser) => {
    if (fbUser) mirrorToLocal(fbUser)
    else state.user = null
  })
})()

export const authFirebase = {
  state,
  currentUser() {
    return state.user
  },

  async register({ name, email, password, role = 'user' }) {
    const { a, m } = await mod()
    const cred = await m.createUserWithEmailAndPassword(a, email, password)
    if (name) await m.updateProfile(cred.user, { displayName: name })
    await m.sendEmailVerification(cred.user)
    upsertUser({
      email,
      name: name || email.split('@')[0],
      role,
      password: 'oauth',
      verified: false,
    })
    return { email }
  },

  async login({ email, password }) {
    const { a, m } = await mod()
    const result = await m.signInWithEmailAndPassword(a, email, password)
    return mirrorToLocal(result.user)
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
      if (code === 'auth/unauthorized-domain') {
        throw new Error(
          'Unauthorized domain. Add domain in Firebase → Authentication → Settings → Authorized domains.',
        )
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'Google provider is disabled. Enable it in Authentication → Sign-in method.',
        )
      }
      throw e
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
