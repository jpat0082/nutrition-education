import { reactive } from 'vue'
import { isDisposableDomain, normEmail, makeCode, nowSec } from '../utils/validation.js'
import { listUsers, findByEmail, upsertUser } from './userRegistry'
import { authFirebase } from './AuthFirebaseAdapter'

function createLocalAuth() {
  const SESSION_KEY = 'ph_session'
  const VERIFY_KEY = 'ph_verify'
  function loadJSON(k, fb) {
    try {
      const r = localStorage.getItem(k)
      return r ? JSON.parse(r) : fb
    } catch {
      return fb
    }
  }
  function saveJSON(k, v) {
    if (v === null || v === undefined) localStorage.removeItem(k)
    else localStorage.setItem(k, JSON.stringify(v))
  }

  const state = reactive({
    user: loadJSON(SESSION_KEY, null),
    verify: loadJSON(VERIFY_KEY, {}),
    pending2FA: null,
  })
  function saveSession(s) {
    saveJSON(SESSION_KEY, s)
  }
  function saveVerify() {
    saveJSON(VERIFY_KEY, state.verify)
  }

  if (!listUsers().some((u) => u.role === 'admin')) {
    upsertUser({
      name: 'Site Admin',
      email: 'admin@example.com',
      role: 'admin',
      password: 'Admin@1234',
      disabled: false,
      verified: true,
      twoFactorEnabled: false,
    })
  }

  return {
    state,
    currentUser() {
      return state.user
    },

    async register({ name, email, password, role = 'user' }) {
      email = normEmail(email)
      if (!email) throw new Error('Email is required.')
      if (isDisposableDomain(email)) throw new Error('Please use a real email address.')
      if (!password || password.length < 8) throw new Error('Use 8+ character password.')
      if (findByEmail(email)) throw new Error('Email already registered.')
      upsertUser({
        name: (name || '').trim() || email,
        email,
        password,
        role,
        disabled: false,
        verified: false,
        twoFactorEnabled: false,
      })
      const code = makeCode()
      state.verify[email] = { code, createdAtSec: nowSec() }
      saveVerify()
      return { email, code }
    },

    async login({ email, password, remember = true }) {
      email = normEmail(email)
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      if (rec.disabled) throw new Error('Account is disabled')
      if (rec.verified === false) throw new Error('Please verify your email first.')
      if (String(rec.password) !== String(password)) throw new Error('Invalid credentials.')
      if (rec.twoFactorEnabled) {
        state.pending2FA = { email: rec.email, otp: makeCode(), createdAtSec: nowSec() }
        const e = new Error('2FA_REQUIRED')
        e.code = '2FA_REQUIRED'
        throw e
      }
      const session = { id: rec.id, email: rec.email, name: rec.name, role: rec.role }
      state.user = session
      saveSession(session)
      localStorage.setItem('ph_last_email', rec.email)
      localStorage.setItem('ph_last_user', rec.name || rec.email.split('@')[0])
      if (!remember)
        window.addEventListener('beforeunload', () => saveSession(null), { once: true })
      return session
    },

    complete2FA({ email, code, remember = true }) {
      email = normEmail(email)
      const p = state.pending2FA
      if (!p || p.email !== email) throw new Error('No 2FA in progress.')
      if (nowSec() - p.createdAtSec > 300) {
        state.pending2FA = null
        throw new Error('2FA code expired.')
      }
      if (String(code) !== String(p.otp)) throw new Error('Invalid 2FA code.')
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      const session = { id: rec.id, email: rec.email, name: rec.name, role: rec.role }
      state.user = session
      saveSession(session)
      state.pending2FA = null
      if (!remember)
        window.addEventListener('beforeunload', () => saveSession(null), { once: true })
    },

    resend2FA(email) {
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      state.pending2FA = { email: rec.email, otp: makeCode(), createdAtSec: nowSec() }
      return { email: rec.email, code: state.pending2FA.otp }
    },

    async resendVerification(email) {
      email = normEmail(email)
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      if (rec.verified) return { alreadyVerified: true }
      const code = makeCode()
      state.verify[email] = { code, createdAtSec: nowSec() }
      saveVerify()
      return { email, code }
    },

    verifyEmail({ email, code }) {
      email = normEmail(email)
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      const v = state.verify[email]
      if (!v) throw new Error('No verification in progress.')
      if (String(v.code) !== String(code)) throw new Error('Invalid verification code.')
      if (nowSec() - v.createdAtSec > 1800) throw new Error('Code expired. Please resend.')
      upsertUser({ ...rec, verified: true })
      delete state.verify[email]
      saveVerify()
      return { ok: true }
    },

    updateProfile({ email, name }) {
      email = normEmail(email)
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      const next = upsertUser({ ...rec, name: (name || '').trim() || rec.email })
      if (state.user?.email === email) {
        state.user = { id: next.id, email: next.email, name: next.name, role: next.role }
        localStorage.setItem(SESSION_KEY, JSON.stringify(state.user))
      }
    },

    async changePassword({ email, oldPassword, newPassword }) {
      email = normEmail(email)
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      if (String(rec.password) !== String(oldPassword)) throw new Error('Old password incorrect.')
      if (!newPassword || newPassword.length < 8) throw new Error('New password too short.')
      upsertUser({ ...rec, password: String(newPassword) })
    },

    toggle2FA(email, enable) {
      email = normEmail(email)
      const rec = findByEmail(email)
      if (!rec) throw new Error('User not found')
      upsertUser({ ...rec, twoFactorEnabled: !!enable })
    },

    async loginWithGoogle() {
      throw new Error(
        'Google sign-in requires Firebase. Set VITE_USE_FIREBASE=1 and restart the dev server.',
      )
    },

    logout() {
      this.state.user = null
      localStorage.removeItem(SESSION_KEY)
    },

    get users() {
      return listUsers()
    },
  }
}

const useFirebase =
  String(import.meta.env.VITE_USE_FIREBASE || '')
    .trim()
    .toLowerCase() === '1' ||
  String(import.meta.env.VITE_USE_FIREBASE || '')
    .trim()
    .toLowerCase() === 'true'

export const auth = useFirebase ? authFirebase : createLocalAuth()
