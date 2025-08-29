const LS_SAVED_CRED = 'ne_saved_cred'

function enc(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch {
    return ''
  }
}
function dec(str) {
  try {
    return decodeURIComponent(escape(atob(str)))
  } catch {
    return ''
  }
}

export function saveCredentials({ email, password }) {
  if (!email || !password) return
  const blob = { e: enc(email), p: enc(password) }
  localStorage.setItem(LS_SAVED_CRED, JSON.stringify(blob))
}

export function loadCredentials() {
  try {
    const raw = localStorage.getItem(LS_SAVED_CRED)
    if (!raw) return null
    const blob = JSON.parse(raw)
    return { email: dec(blob.e || ''), password: dec(blob.p || '') }
  } catch {
    return null
  }
}

export function clearSavedCredentials() {
  localStorage.removeItem(LS_SAVED_CRED)
}
