import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import admin from 'firebase-admin'
import cors from 'cors'
import sgMail from '@sendgrid/mail'

import { createRequire } from 'node:module'

admin.initializeApp()
const db = admin.firestore()
const corsHandler = cors({ origin: true })

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
const SENDGRID_FROM = defineSecret('SENDGRID_FROM')
const SEED_TOKEN = defineSecret('SEED_TOKEN')

const require = createRequire(import.meta.url)
let recipesSeed = []
try {
  recipesSeed = require('./data/recipes.json')
} catch {
  //
}

async function assertAuthed(auth) {
  const uid = auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Login required.')
  return uid
}
async function assertAdmin(uid) {
  const snap = await db.collection('users').doc(uid).get()
  const role = snap.exists ? snap.data().role : 'user'
  if (role !== 'admin') throw new HttpsError('permission-denied', 'Admin only.')
}

export const sendEmail = onRequest(
  { secrets: [SENDGRID_API_KEY, SENDGRID_FROM] },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
        const { to, subject, text, html, attachments } = req.body || {}
        if (!to || !subject || !text) return res.status(400).send('Missing fields')

        const apiKey = SENDGRID_API_KEY.value()
        const fromAddr = SENDGRID_FROM.value()
        if (!apiKey || !fromAddr) return res.status(500).send('SendGrid not configured')

        sgMail.setApiKey(apiKey)
        await sgMail.send({
          to,
          from: fromAddr,
          subject,
          text,
          html: html || undefined,
          attachments: Array.isArray(attachments) ? attachments : undefined,
        })
        res.json({ ok: true })
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message || 'send failed' })
      }
    })
  },
)

export const sendBulkEmail = onCall(
  { secrets: [SENDGRID_API_KEY, SENDGRID_FROM] },
  async (request) => {
    const uid = await assertAuthed(request.auth)
    await assertAdmin(uid)

    const { subject, html, to, from } = request.data || {}
    if (!subject || !html || !Array.isArray(to) || to.length === 0) {
      throw new HttpsError('invalid-argument', 'subject, html, to[] required')
    }

    const apiKey = SENDGRID_API_KEY.value()
    const fromAddr = from || SENDGRID_FROM.value()
    if (!apiKey || !fromAddr) {
      throw new HttpsError('failed-precondition', 'SendGrid not configured')
    }

    sgMail.setApiKey(apiKey)
    await sgMail.sendMultiple({ to, from: fromAddr, subject, html })
    return { ok: true, count: to.length }
  },
)

export const apiRecipes = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')
      const tag = String(req.query.tag || '').toLowerCase()
      const snap = await db.collection('recipes').where('status', '==', 'approved').get()
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      if (tag) {
        items = items.filter((r) =>
          (r.tags || []).map((t) => String(t).toLowerCase()).includes(tag),
        )
      }
      res.json({ items })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })
})

export const apiEvents = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')
      const snap = await db.collection('events').get()
      res.json({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })
})

export const apiMetricsTags = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const snap = await db.collection('recipes').where('status', '==', 'approved').get()
      const map = {}
      snap.forEach((doc) =>
        (doc.data().tags || []).forEach((t) => {
          const k = String(t).toLowerCase()
          map[k] = (map[k] || 0) + 1
        }),
      )
      const rows = Object.entries(map).map(([tag, count]) => ({ tag, count }))
      res.json({ rows })
    } catch (e) {
      res.status(500).json({ error: e.message })
    }
  })
})

export const seedRecipes = onRequest({ secrets: [SEED_TOKEN] }, async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
      const token = String(req.query.token || req.headers['x-seed-token'] || '')
      if (token !== SEED_TOKEN.value()) return res.status(401).send('Unauthorized')
      if (!Array.isArray(recipesSeed) || recipesSeed.length === 0) {
        return res.status(500).send('Missing data/recipes.json')
      }

      const col = db.collection('recipes')
      const batch = db.batch()
      recipesSeed.forEach((r) => {
        const id = r.id ? String(r.id) : col.doc().id
        batch.set(col.doc(id), {
          title: r.title || '',
          minutes: Number(r.minutes || 0),
          tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
          ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
          instructions: r.instructions || '',
          status: r.status || 'approved',
        })
      })
      await batch.commit()
      res.json({ ok: true, count: recipesSeed.length })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'seed failed' })
    }
  })
})

export const createBooking = onCall(async (request) => {
  const uid = await assertAuthed(request.auth)
  const { startISO, endISO, title } = request.data || {}

  const start = new Date(startISO)
  const end = new Date(endISO)
  if (!startISO || !endISO || isNaN(start) || isNaN(end) || end <= start) {
    throw new HttpsError('invalid-argument', 'Bad times')
  }

  const qs = await db.collection('bookings').where('end', '>', start).where('start', '<', end).get()

  if (!qs.empty) throw new HttpsError('already-exists', 'Time slot is taken.')

  const ref = await db.collection('bookings').add({
    userId: uid,
    title: title || 'Appointment',
    start,
    end,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  return { id: ref.id }
})
