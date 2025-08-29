export const patterns = {
  email: /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/,
  passwordStrong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  phone10: /^(?:|\d{10})$/,
  name: /^[A-Za-z][A-Za-z\s'.-]{1,48}$/,
}

export function normEmail(e) {
  return String(e || '')
    .trim()
    .toLowerCase()
}

const DISPOSABLE_SNIPPETS = [
  'mailinator',
  'tempmail',
  '10minutemail',
  'guerrillamail',
  'yopmail',
  'trashmail',
  'dispostable',
  'getnada',
  'moakt',
  'fakeinbox',
  'sharklasers',
  'maildrop',
  'throwaway',
  'e4ward',
  'anonbox',
  'spambox',
]
export function isDisposableDomain(email) {
  const at = String(email).split('@')[1] || ''
  return DISPOSABLE_SNIPPETS.some((sn) => at.includes(sn))
}

export function hasURL(text) {
  return /(https?:\/\/|www\.)/i.test(text || '')
}
export function hasProfanity(text) {
  return /\b(damn|shit|crap|hell)\b/i.test(text || '')
}

export function focusFirstInvalid(formEl) {
  if (!formEl) return
  const invalid = formEl.querySelector('.is-invalid, :invalid')
  if (invalid && typeof invalid.focus === 'function') invalid.focus()
}

export function makeCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function nowSec() {
  return Math.floor(Date.now() / 1000)
}
