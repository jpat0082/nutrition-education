// Minimal reactive auth store using localStorage
import { reactive } from 'vue'
import { sha256 } from '../utils/crypto.js'

const state = reactive({
  user: JSON.parse(localStorage.getItem('ne_user')) || null,
  users: JSON.parse(localStorage.getItem('ne_users')) || [], // array of {name,email,hash,role}
})

function persist() {
  localStorage.setItem('ne_user', JSON.stringify(state.user))
  localStorage.setItem('ne_users', JSON.stringify(state.users))
}

export const auth = {
  state,
  register: async ({ name, email, password, role = 'user' }) => {
    email = email.trim().toLowerCase()
    const exists = state.users.some((u) => u.email === email)
    if (exists) throw new Error('User already exists.')
    const hash = await sha256(password)
    state.users.push({ name, email, hash, role })
    persist()
  },
  login: async ({ email, password }) => {
    email = email.trim().toLowerCase()
    const u = state.users.find((u) => u.email === email)
    if (!u) throw new Error('User not found.')
    const hash = await sha256(password)
    if (hash !== u.hash) throw new Error('Invalid credentials.')
    state.user = { name: u.name, email: u.email, role: u.role }
    persist()
  },
  logout: () => {
    state.user = null
    persist()
  },
  currentUser: () => state.user,
  seedAdmin: async () => {
    // helper to create an admin if none exists
    if (!state.users.some((u) => u.role === 'admin')) {
      const hash = await sha256('Admin@1234')
      state.users.push({ name: 'Site Admin', email: 'admin@example.com', hash, role: 'admin' })
      persist()
    }
  },
}
