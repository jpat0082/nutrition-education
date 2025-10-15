export async function sendContactEmail({ to, subject, text, html, attachments = [] }) {
  const base = import.meta.env.VITE_FUNCTIONS_BASE
  if (!base) throw new Error('VITE_FUNCTIONS_BASE is not set')
  const res = await fetch(`${base}/sendEmail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, text, html, attachments }),
  })
  if (!res.ok) throw new Error(`Email error: ${await res.text()}`)
  return await res.json()
}
