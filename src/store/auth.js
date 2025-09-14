// src/store/auth.js  — unified auth using the shared LocalStorage registry
import { reactive } from 'vue'
import { listUsers, findByEmail, upsertUser } from './userRegistry' // <-- shared source of truth for users

import { isDisposableDomain, normEmail, makeCode, nowSec } from '../utils/validation.js'

// Session + verification storage (separate from the registry)
const SESSION_KEY = 'ph_session'
const VERIFY_KEY = 'ph_verify' // { [email]: { code, createdAtSec } }

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
  user: loadJSON(SESSION_KEY, null), // { id, email, name, role }
  verify: loadJSON(VERIFY_KEY, {}), // verification codes
  pending2FA: null, // { email, otp, createdAtSec }
})

/** Helpers */
function saveSession(s) {
  saveJSON(SESSION_KEY, s)
}
function saveVerify() {
  saveJSON(VERIFY_KEY, state.verify)
}

/** Optional: make sure there is at least one admin */
function ensureSeedAdmin() {
  const hasAdmin = listUsers().some((u) => u.role === 'admin')
  if (!hasAdmin) {
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
}
ensureSeedAdmin()

export const auth = {
  state,

  currentUser() {
    return state.user
  },

  /** Register a new account (writes to the shared registry).
   *  We also create a verification code (simple demo flow).
   */
  async register({ name, email, password, role = 'user' }) {
    email = normEmail(email)
    if (!email) throw new Error('Email is required.')
    if (isDisposableDomain(email)) throw new Error('Please use a real email address.')
    if (!password || password.length < 8) throw new Error('Use 8+ character password.')
    if (findByEmail(email)) throw new Error('Email already registered.')

    // Store in registry; keep extra flags the admin can ignore
    upsertUser({
      name: (name || '').trim() || email,
      email,
      password,
      role,
      disabled: false,
      verified: false,
      twoFactorEnabled: false,
    })

    // Create verification code
    const code = makeCode()
    state.verify[email] = { code, createdAtSec: nowSec() }
    saveVerify()

    return { email, code } // your UI can show this or navigate to /verify
  },

  /** Login against the shared registry */
  async login({ email, password, remember = true }) {
    email = normEmail(email)
    const rec = findByEmail(email)
    if (!rec) throw new Error('User not found')
    if (rec.disabled) throw new Error('Account is disabled')
    if (rec.verified === false) throw new Error('Please verify your email first.')
    if (String(rec.password) !== String(password)) throw new Error('Invalid credentials.')

    // 2FA flow (optional flag stored on the record)
    if (rec.twoFactorEnabled) {
      state.pending2FA = { email: rec.email, otp: makeCode(), createdAtSec: nowSec() }
      const e = new Error('2FA_REQUIRED')
      e.code = '2FA_REQUIRED'
      throw e
    }

    const session = { id: rec.id, email: rec.email, name: rec.name, role: rec.role }
    state.user = session
    saveSession(session)

    // for admin “import from session”
    localStorage.setItem('ph_last_email', rec.email)
    localStorage.setItem('ph_last_user', rec.name || rec.email.split('@')[0])

    if (!remember) window.addEventListener('beforeunload', () => saveSession(null), { once: true })
    return session
  },

  /** Complete 2FA after login throws {code:'2FA_REQUIRED'} */
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
    if (!remember) window.addEventListener('beforeunload', () => saveSession(null), { once: true })
  },

  resend2FA(email) {
    const rec = findByEmail(email)
    if (!rec) throw new Error('User not found')
    state.pending2FA = { email: rec.email, otp: makeCode(), createdAtSec: nowSec() }
    return { email: rec.email, code: state.pending2FA.otp }
  },

  /** Email verification helpers */
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
    if (rec.verified) return { ok: true, alreadyVerified: true }

    const v = state.verify[email]
    if (!v) throw new Error('No verification in progress.')
    if (String(v.code) !== String(code)) throw new Error('Invalid verification code.')
    if (nowSec() - v.createdAtSec > 1800) throw new Error('Code expired. Please resend.')

    upsertUser({ ...rec, verified: true }) // update the registry
    delete state.verify[email]
    saveVerify()
    return { ok: true }
  },

  /** Profile / password / 2FA toggles (all via registry) */
  updateProfile({ email, name }) {
    email = normEmail(email)
    const rec = findByEmail(email)
    if (!rec) throw new Error('User not found')
    const next = upsertUser({ ...rec, name: (name || '').trim() || rec.email })
    if (state.user?.email === email) {
      state.user = { id: next.id, email: next.email, name: next.name, role: next.role }
      saveSession(state.user)
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

  logout() {
    state.user = null
    saveSession(null)
  },

  // For dashboards that still expect auth.users
  get users() {
    return listUsers()
  },
}
