export async function callCreateBooking({ startISO, endISO, title }) {
  const { fn, httpsCallable } = await (
    await import('@/utils/FirebaseClient')
  ).getFirebaseFunctions()
  const callable = httpsCallable(fn, 'createBooking')
  const r = await callable({ startISO, endISO, title })
  return r.data
}

export async function callSendBulkEmail({ subject, html, to, from }) {
  const { fn, httpsCallable } = await (
    await import('@/utils/FirebaseClient')
  ).getFirebaseFunctions()
  const callable = httpsCallable(fn, 'sendBulkEmail')
  try {
    const r = await callable({ subject, html, to, from })
    return r.data
  } catch (e) {
    const code = e?.code || 'unknown'
    const msg = e?.message || 'Send failed'
    const details = e?.details ? ` — ${e.details}` : ''
    throw new Error(`${code}: ${msg}${details}`)
  }
}

export async function getMetricsTags() {
  const res = await fetch('/api/metrics/tags')
  if (!res.ok) throw new Error('metrics failed')
  return (await res.json()).rows || []
}

export async function listEventsApi() {
  const res = await fetch('/api/events')
  if (!res.ok) throw new Error('events api failed')
  return (await res.json()).items || []
}

export async function listRecipesApi({ tag } = {}) {
  const url = tag ? `/api/recipes?tag=${encodeURIComponent(tag)}` : '/api/recipes'
  const res = await fetch(url)
  if (!res.ok) throw new Error('recipes api failed')
  return (await res.json()).items || []
}
