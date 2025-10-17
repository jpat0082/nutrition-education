const KEY = 'ph_app_users'

export function listUsers() {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveUsers(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr))
  window.dispatchEvent(new CustomEvent('ph_users_changed', { detail: arr }))
}

export function upsertUser(u) {
  const users = listUsers()
  const email = String(u.email || '')
    .toLowerCase()
    .trim()
  if (!email) throw new Error('Email required')

  const idx = users.findIndex((x) => (x.email || '').toLowerCase() === email)

  if (idx >= 0) {
    const prev = users[idx]
    users[idx] = {
      ...prev,
      ...u,
      email,
      password: u.password ? String(u.password) : prev.password,
      phone: u.phone !== undefined ? String(u.phone) : prev.phone || '',
      id: prev.id ?? Date.now() + Math.random(),
    }
  } else {
    users.unshift({
      id: u.id ?? Date.now() + Math.random(),
      name: u.name || email.split('@')[0],
      email,
      role: u.role === 'admin' ? 'admin' : 'user',
      disabled: !!u.disabled,
      password: String(u.password || '1234'),
      phone: u.phone ? String(u.phone) : '',
      verified: !!u.verified,
      twoFactorEnabled: !!u.twoFactorEnabled,
    })
  }

  saveUsers(users)
  return findByEmail(email)
}

export function removeUser(id) {
  const users = listUsers().filter((u) => u.id !== id)
  saveUsers(users)
}

export function toggleDisabled(id) {
  const users = listUsers()
  const i = users.findIndex((u) => u.id === id)
  if (i >= 0) {
    users[i] = { ...users[i], disabled: !users[i].disabled }
    saveUsers(users)
  }
}

export function setRole(id, role) {
  const users = listUsers()
  const i = users.findIndex((u) => u.id === id)
  if (i >= 0) {
    users[i] = { ...users[i], role: role === 'admin' ? 'admin' : 'user' }
    saveUsers(users)
  }
}

export function findByEmail(email) {
  const e = String(email || '')
    .toLowerCase()
    .trim()
  return listUsers().find((u) => (u.email || '').toLowerCase() === e) || null
}

export function listen(cb) {
  const onLS = (ev) => {
    if (ev?.key && ev.key !== KEY) return
    cb(listUsers())
  }
  const onCE = (ev) => cb(ev.detail || listUsers())

  window.addEventListener('storage', onLS)
  window.addEventListener('ph_users_changed', onCE)

  cb(listUsers())

  return () => {
    window.removeEventListener('storage', onLS)
    window.removeEventListener('ph_users_changed', onCE)
  }
}
