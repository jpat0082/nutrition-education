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

async function authMod() {
  const a = await getFirebaseAuth()
  const m = await import('firebase/auth')
  return { a, m }
}

;(async () => {
  const { a, m } = await authMod()
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
    const { a, m } = await authMod()
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
    const { a, m } = await authMod()
    const result = await m.signInWithEmailAndPassword(a, email, password)
    return mirrorToLocal(result.user)
  },

  async loginWithGoogle() {
    const { a, m } = await authMod()
    const provider = await getGoogleProvider()
    const result = await m.signInWithPopup(a, provider)
    return mirrorToLocal(result.user)
  },

  async resendVerification(email) {
    const { a, m } = await authMod()
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
    if (rec) upsertUser({ ...rec, name: name || rec.name })
  },

  async changePassword() {
    throw new Error('Change password through Firebase account settings.')
  },

  toggle2FA() {},

  async logout() {
    const { a, m } = await authMod()
    await m.signOut(a)
  },
}
