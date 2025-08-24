import { reactive } from 'vue'
import { sha256 } from '../utils/crypto.js'

const LS_USERS = 'ne_users'
const LS_SESSION = 'ne_session'

function normEmail(e) {
  return String(e || '')
    .trim()
    .toLowerCase()
}

function migrateUsers(arr) {
  if (!Array.isArray(arr)) return []
  const map = new Map()
  for (const u of arr) {
    const email = normEmail(u.email)
    if (!email) continue

    if (!map.has(email) || (u.hash && !map.get(email).hash)) {
      map.set(email, {
        name: (u.name || '').trim() || email,
        email,
        hash: u.hash || '',
        role: u.role || 'user',
      })
    }
  }
  return [...map.values()]
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(LS_USERS)
    const arr = raw ? JSON.parse(raw) : []
    const migrated = migrateUsers(arr)
    localStorage.setItem(LS_USERS, JSON.stringify(migrated))
    return migrated
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users))
}

function loadSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION)
    const s = raw ? JSON.parse(raw) : null
    if (s && s.email) s.email = normEmail(s.email)
    return s
  } catch {
    return null
  }
}
function saveSession(s) {
  if (!s) localStorage.removeItem(LS_SESSION)
  else localStorage.setItem(LS_SESSION, JSON.stringify(s))
}

const state = reactive({
  users: loadUsers(),
  user: loadSession(),
})

export const auth = {
  state,

  async seedAdmin() {
    if (!state.users.some((u) => u.role === 'admin')) {
      const hash = await sha256('Admin@1234')
      state.users.push({ name: 'Site Admin', email: 'admin@example.com', hash, role: 'admin' })
      saveUsers(state.users)
    }
  },

  async register({ name, email, password, role = 'user' }) {
    email = normEmail(email)
    if (!email) throw new Error('Email is required.')
    if (!password || password.length < 8) throw new Error('Use 8+ char password.')
    if (state.users.some((u) => u.email === email)) throw new Error('User already exists.')

    const hash = await sha256(password)
    state.users.push({ name: (name || '').trim() || email, email, hash, role })
    saveUsers(state.users)
  },

  async login({ email, password, remember = true }) {
    email = normEmail(email)
    const u = state.users.find((u) => u.email === email)
    if (!u) throw new Error('User not found. Try registering first.')
    const hash = await sha256(password)
    if (hash !== u.hash) throw new Error('Invalid credentials.')

    state.user = { name: u.name, email: u.email, role: u.role }
    saveSession(state.user)

    if (!remember) {
      window.addEventListener('beforeunload', () => saveSession(null), { once: true })
    }
  },

  logout() {
    state.user = null
    saveSession(null)
  },

  currentUser() {
    return state.user
  },

  updateProfile({ email, name }) {
    email = normEmail(email)
    const i = state.users.findIndex((u) => u.email === email)
    if (i < 0) throw new Error('User not found.')
    state.users[i].name = (name || '').trim() || email
    saveUsers(state.users)
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
    saveUsers(state.users)
  },
}
