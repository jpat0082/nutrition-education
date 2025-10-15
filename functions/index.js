import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import admin from 'firebase-admin'
import sgMail from '@sendgrid/mail'
import cors from 'cors'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const recipes = require('./data/recipes.json')

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY')
const SEED_TOKEN = defineSecret('SEED_TOKEN')

admin.initializeApp()
const corsHandler = cors({ origin: true })

export const sendEmail = onRequest({ secrets: [SENDGRID_API_KEY] }, async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method not allowed')
      const { to, subject, text, html, attachments } = req.body || {}
      if (!to || !subject || !text) return res.status(400).send('Missing fields')
      sgMail.setApiKey(SENDGRID_API_KEY.value())
      const msg = {
        to,
        from: { email: 'no-reply@publichealth.example', name: 'Public Health' },
        subject,
        text,
        html: html || undefined,
        attachments: Array.isArray(attachments) ? attachments : undefined,
      }
      await sgMail.send(msg)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'send failed' })
    }
  })
})

export const api = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      const db = admin.firestore()
      if (req.method !== 'GET') return res.status(405).send('Method not allowed')
      const parts = (req.path || req.url || '').replace(/^\/+/, '').split('/')
      if (parts[0] !== 'recipes') return res.status(404).send('Not found')
      if (parts.length === 1) {
        const snap = await db.collection('recipes').get()
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        return res.json(items)
      } else {
        const doc = await db.collection('recipes').doc(parts[1]).get()
        if (!doc.exists) return res.status(404).send('Not found')
        return res.json({ id: doc.id, ...doc.data() })
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'server error' })
    }
  })
})

export const seedRecipes = onRequest({ secrets: [SEED_TOKEN] }, async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method not allowed')
      const token = String(req.query.token || req.headers['x-seed-token'] || '')
      if (token !== SEED_TOKEN.value()) return res.status(401).send('Unauthorized')

      const db = admin.firestore()
      const batch = db.batch()
      const col = db.collection('recipes')

      recipes.forEach((r) => {
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
      res.json({ ok: true, count: recipes.length })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'seed failed' })
    }
  })
})
