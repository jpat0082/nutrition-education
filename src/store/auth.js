import { reactive } from 'vue'
import { sha256 } from '../utils/crypto.js'
import { isDisposableDomain, normEmail, makeCode, nowSec } from '../utils/validation.js'

const LS_USERS = 'ne_users'
const LS_SESSION = 'ne_session'
const LS_VERIFY = 'ne_verify'

function loadJSON(k, fb) {
  try {
    const r = localStorage.getItem(k)
    return r ? JSON.parse(r) : fb
  } catch {
    return fb
  }
}
function saveJSON(k, v) {
  localStorage.setItem(k, JSON.stringify(v))
}

function migrateUsers(arr) {
  if (!Array.isArray(arr)) return []
  const map = new Map()
  for (const u of arr) {
    const email = normEmail(u.email)
    if (!email) continue
    const next = {
      name: (u.name || '').trim() || email,
      email,
      hash: u.hash || '',
      role: u.role || 'user',
      verified: typeof u.verified === 'boolean' ? u.verified : true,
      twoFactorEnabled: !!u.twoFactorEnabled,
    }
    const v = map.get(email)
    if (!v || (next.hash && !v.hash)) map.set(email, next)
  }
  return [...map.values()]
}

const state = reactive({
  users: (() => {
    const m = migrateUsers(loadJSON(LS_USERS, []))
    saveJSON(LS_USERS, m)
    return m
  })(),
  user: loadJSON(LS_SESSION, null),
  verify: loadJSON(LS_VERIFY, {}),
  pending2FA: null,
})

const saveUsers = () => saveJSON(LS_USERS, state.users)
const saveSession = (s) => (s ? saveJSON(LS_SESSION, s) : localStorage.removeItem(LS_SESSION))
const saveVerify = () => saveJSON(LS_VERIFY, state.verify)

export const auth = {
  state,

  async seedAdmin() {
    if (!state.users.some((u) => u.role === 'admin')) {
      const hash = await sha256('Admin@1234')
      state.users.push({
        name: 'Site Admin',
        email: 'admin@example.com',
        hash,
        role: 'admin',
        verified: true,
        twoFactorEnabled: false,
      })
      saveUsers()
    }
  },

  async register({ name, email, password, role = 'user' }) {
    email = normEmail(email)
    if (!email) throw new Error('Email is required.')
    if (isDisposableDomain(email))
      throw new Error('Please use a real email address (disposable domains are blocked).')
    if (!password || password.length < 8) throw new Error('Use 8+ char password.')
    if (state.users.some((u) => u.email === email)) throw new Error('User already exists.')

    const hash = await sha256(password)
    state.users.push({
      name: (name || '').trim() || email,
      email,
      hash,
      role,
      verified: false,
      twoFactorEnabled: false,
    })
    saveUsers()

    const code = makeCode()
    state.verify[email] = { code, createdAtSec: nowSec() }
    saveVerify()
    return { email, code }
  },

  async login({ email, password, remember = true }) {
    email = normEmail(email)
    const u = state.users.find((u) => u.email === email)
    if (!u) throw new Error('User not found. Try registering first.')
    if (!u.verified) throw new Error('Please verify your email first.')
    const hash = await sha256(password)
    if (hash !== u.hash) throw new Error('Invalid credentials.')

    if (u.twoFactorEnabled) {
      state.pending2FA = { email: u.email, otp: makeCode(), createdAtSec: nowSec() }

      const e = new Error('2FA_REQUIRED')
      e.code = '2FA_REQUIRED'
      throw e
    }

    state.user = { name: u.name, email: u.email, role: u.role }
    saveSession(state.user)
    if (!remember) window.addEventListener('beforeunload', () => saveSession(null), { once: true })
  },

  complete2FA({ email, code, remember = true }) {
    const p = state.pending2FA
    if (!p || p.email !== normEmail(email)) throw new Error('No 2FA in progress.')
    if (nowSec() - p.createdAtSec > 300) {
      state.pending2FA = null
      throw new Error('2FA code expired.')
    }
    if (String(code) !== String(p.otp)) throw new Error('Invalid 2FA code.')

    const u = state.users.find((u) => u.email === p.email)
    if (!u) throw new Error('User not found.')

    state.user = { name: u.name, email: u.email, role: u.role }
    saveSession(state.user)
    state.pending2FA = null
    if (!remember) window.addEventListener('beforeunload', () => saveSession(null), { once: true })
  },

  resend2FA(email) {
    const u = state.users.find((u) => u.email === normEmail(email))
    if (!u) throw new Error('User not found.')
    state.pending2FA = { email: u.email, otp: makeCode(), createdAtSec: nowSec() }
    return { email: u.email, code: state.pending2FA.otp }
  },

  toggle2FA(email, enable) {
    const i = state.users.findIndex((u) => u.email === normEmail(email))
    if (i < 0) throw new Error('User not found.')
    state.users[i].twoFactorEnabled = !!enable
    saveUsers()
  },

  logout() {
    state.user = null
    saveSession(null)
  },
  currentUser() {
    return state.user
  },

  async resendVerification(email) {
    email = normEmail(email)
    const u = state.users.find((u) => u.email === email)
    if (!u) throw new Error('User not found.')
    if (u.verified) return { alreadyVerified: true }
    const code = makeCode()
    state.verify[email] = { code, createdAtSec: nowSec() }
    saveVerify()
    return { email, code }
  },

  verifyEmail({ email, code }) {
    email = normEmail(email)
    const u = state.users.find((u) => u.email === email)
    if (!u) throw new Error('User not found.')
    if (u.verified) return { ok: true, alreadyVerified: true }

    const rec = state.verify[email]
    if (!rec) throw new Error('No verification in progress.')
    if (String(rec.code) !== String(code)) throw new Error('Invalid verification code.')
    if (nowSec() - rec.createdAtSec > 1800) throw new Error('Code expired. Please resend.')

    u.verified = true
    delete state.verify[email]
    saveUsers()
    saveVerify()
    return { ok: true }
  },

  updateProfile({ email, name }) {
    email = normEmail(email)
    const i = state.users.findIndex((u) => u.email === email)
    if (i < 0) throw new Error('User not found.')
    state.users[i].name = (name || '').trim() || email
    saveUsers()
    if (state.user?.email === email) {
      state.user.name = state.users[i].name
      saveSession(state.user)
    }
  },

  async changePassword({ email, oldPassword, newPassword }) {
    email = normEmail(email)
    const i = state.users.findIndex((u) => u.email === email)
    if (i < 0) throw new Error('User not found.')
    const oldHash = await sha256(oldPassword)
    if (oldHash !== state.users[i].hash) throw new Error('Old password incorrect.')
    if (!newPassword || newPassword.length < 8) throw new Error('New password too short.')
    state.users[i].hash = await sha256(newPassword)
    saveUsers()
  },
}
