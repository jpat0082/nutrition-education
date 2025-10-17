<template>
  <div class="admin bg-light-subtle p-3 rounded-3 shadow-sm">
    <section
      class="p-3 p-md-4 rounded-3 mb-3 bg-white shadow-sm d-flex flex-wrap gap-2 align-items-center"
    >
      <h1 class="h4 mb-0 text-primary">Admin Dashboard</h1>
      <span class="badge bg-dark text-uppercase">admin</span>
      <span class="ms-auto small text-muted"
        >Status: <strong>{{ online ? 'Online' : 'Offline' }}</strong></span
      >
    </section>

    <section class="mb-3">
      <div class="row g-3">
        <div class="col-md-3" v-for="c in kpiCards" :key="c.title">
          <div class="p-3 rounded-3 shadow-sm kpi-card">
            <div class="small text-muted">{{ c.title }}</div>
            <div class="display-6 fw-semibold">{{ c.value }}</div>
            <div class="small text-muted">{{ c.note }}</div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="p-3 rounded-3 bg-white border shadow-sm">
            <div class="d-flex align-items-center justify-content-between">
              <h2 class="h6 mb-2">Popular Recipe Tags</h2>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="reloadChart"
                :disabled="loadingChart"
              >
                {{ loadingChart ? 'Refreshing…' : 'Refresh' }}
              </button>
            </div>
            <div class="chart-box rounded-2 border">
              <canvas ref="chartEl" aria-label="Recipe tags bar chart"></canvas>
            </div>
            <div class="small text-muted mt-2">Data source: API or local cache</div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="p-3 rounded-3 bg-white border shadow-sm">
            <h2 class="h6 mb-2">Bulk Email (SendGrid)</h2>
            <div class="mb-2">
              <label class="form-label small">Subject</label>
              <input v-model="subject" class="form-control" />
            </div>
            <div class="mb-2">
              <label class="form-label small">HTML</label>
              <textarea v-model="html" class="form-control" rows="4"></textarea>
            </div>
            <div class="mb-2">
              <label class="form-label small">Recipients (comma separated)</label>
              <input v-model="toText" class="form-control" placeholder="a@x.com, b@y.com" />
            </div>
            <button class="btn btn-primary btn-sm" :disabled="sending" @click="sendBulk">
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
            <div class="small mt-2">
              <span class="text-success" v-if="ok">Sent {{ sentCount }}</span>
              <span class="text-danger" v-if="err">{{ err }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-3">
      <div class="p-3 rounded-3 bg-white border shadow-sm d-flex flex-wrap gap-2">
        <button class="btn btn-sm btn-outline-danger" @click="clearOnly('recipes')">
          Clear Recipes
        </button>
        <button class="btn btn-sm btn-outline-danger" @click="clearOnly('users')">
          Clear Users
        </button>
        <div class="vr mx-1 d-none d-md-block"></div>
        <input
          ref="fileEl"
          class="d-none"
          type="file"
          accept="application/json"
          @change="onImportFile"
        />
        <button class="btn btn-sm btn-outline-primary" @click="triggerImport">
          Import recipes.json
        </button>
        <button class="btn btn-sm btn-outline-success" @click="exportFiltered">
          Export filtered CSV
        </button>
        <button class="btn btn-sm btn-outline-secondary ms-auto" @click="recalc">
          Recalculate KPIs
        </button>
      </div>
      <div class="small text-muted mt-1" v-if="importMsg">{{ importMsg }}</div>
      <div class="small text-danger mt-1" v-if="importErr">{{ importErr }}</div>
    </section>

    <ul class="nav nav-pills mb-3 bg-body-secondary rounded-3 p-2 shadow-sm">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'recipes' }" @click="tab = 'recipes'">
          Recipes
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'users' }" @click="tab = 'users'">
          Users
        </button>
      </li>
    </ul>

    <div v-show="tab === 'recipes'" class="bg-white p-3 rounded-3 shadow-sm mb-3">
      <AdminRecipesTable @changed="recalc" />
    </div>
    <div v-show="tab === 'users'" class="bg-white p-3 rounded-3 shadow-sm mb-3">
      <AdminUsersTable @changed="recalc" />
    </div>

    <section class="border rounded-3 p-3 bg-white shadow-sm">
      <h2 class="h6 mb-2">Recent users</h2>
      <ul class="list-group">
        <li
          v-for="u in users.slice(0, 8)"
          :key="u.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <span class="truncate">
            <strong>{{ u.name }}</strong>
            <span class="text-muted">— {{ u.email }}</span>
          </span>
          <span class="badge text-bg-secondary text-uppercase">{{ u.role }}</span>
        </li>
        <li v-if="!users.length" class="list-group-item text-muted">No users yet.</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import AdminRecipesTable from './AdminRecipesTable.vue'
import AdminUsersTable from './AdminUsersTable.vue'
import { listen, listUsers } from '@/store/userRegistry'
import { getMetricsTags, callSendBulkEmail } from '@/utils/functionsClient'
import { net } from '@/store/network.js'
import { getFirebaseDb } from '@/utils/FirebaseClient'
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore'

const LS_RECIPES = 'ph_admin_recipes'
const LS_REVIEWS = 'ne_reviews'

const online = computed(() => net.online)
const tab = ref('recipes')

const users = ref(listUsers())
let unlisten = null
onMounted(() => {
  unlisten = listen((all) => {
    users.value = all
    kpi.users = all.length
    kpi.admins = all.filter((u) => u.role === 'admin').length
    kpi.disabled = all.filter((u) => u.disabled).length
  })
  recalc()
  initFilteredListener()
  syncRecipesFromFirestore()
  renderChart()
  refreshCountsFromFirestore()
})
onBeforeUnmount(() => {
  if (unlisten) unlisten()
  removeFilteredListener()
})
watch(online, (isOn) => {
  if (isOn) syncRecipesFromFirestore()
})

const kpi = reactive({
  users: users.value.length,
  admins: users.value.filter((u) => u.role === 'admin').length,
  disabled: users.value.filter((u) => u.disabled).length,
  recipes: 0,
  approved: 0,
  pending: 0,
  reviews: 0,
})
function safeParse(key, fb) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fb
  } catch {
    return fb
  }
}
function recalc() {
  const recipes = safeParse(LS_RECIPES, [])
  const reviewsMap = safeParse(LS_REVIEWS, {})
  kpi.recipes = Array.isArray(recipes) ? recipes.length : 0
  kpi.approved = Array.isArray(recipes) ? recipes.filter((r) => r.status === 'approved').length : 0
  kpi.pending = Math.max(0, kpi.recipes - kpi.approved)
  kpi.reviews = Object.values(reviewsMap).reduce(
    (sum, v) => sum + (Array.isArray(v) ? v.length : 0),
    0,
  )
}

const eventsCount = ref(0)
async function refreshCountsFromFirestore() {
  try {
    const db = await getFirebaseDb()
    const [u, r, e] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'recipes')),
      getCountFromServer(collection(db, 'events')),
    ])
    kpi.users = u.data().count
    kpi.recipes = r.data().count
    kpi.pending = 0
    kpi.approved = 0
    eventsCount.value = e.data().count
  } catch (e) {
    console.warn('Count refresh failed', e)
  }
}

async function syncRecipesFromFirestore() {
  try {
    const db = await getFirebaseDb()
    const qRef = query(collection(db, 'recipes'), where('status', '==', 'approved'))
    const snap = await getDocs(qRef)
    const rows = snap.docs.map((d) => ({
      id: d.id,
      title: String(d.data().title || ''),
      minutes: Number(d.data().minutes || 0),
      tags: Array.isArray(d.data().tags) ? d.data().tags.map(String) : [],
      ingredients: Array.isArray(d.data().ingredients) ? d.data().ingredients.map(String) : [],
      instructions: String(d.data().instructions || ''),
      status: 'approved',
    }))
    localStorage.setItem(LS_RECIPES, JSON.stringify(rows))
    recalc()
  } catch (e) {
    console.warn('Recipe sync failed', e)
  }
}

function clearOnly(which) {
  if (which === 'recipes') localStorage.removeItem(LS_RECIPES)
  else if (which === 'users') localStorage.setItem('ph_app_users', JSON.stringify([]))
  recalc()
}

const kpiCards = computed(() => [
  { title: 'Users', value: kpi.users, note: `Admins: ${kpi.admins} • Disabled: ${kpi.disabled}` },
  {
    title: 'Recipes',
    value: kpi.recipes,
    note: `Approved: ${kpi.approved} • Pending: ${kpi.pending}`,
  },
  { title: 'Reviews', value: kpi.reviews, note: 'From public site (read-only)' },
  { title: 'Events', value: eventsCount.value, note: 'Firestore count if online' },
])

const chartEl = ref(null)
let chart = null
const loadingChart = ref(false)

async function loadTagRows() {
  try {
    loadingChart.value = true
    const rows = await getMetricsTags()
    loadingChart.value = false
    return rows
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    loadingChart.value = false
    const recipes = safeParse(LS_RECIPES, [])
    const map = {}
    for (const r of recipes) {
      const tags = Array.isArray(r.tags) ? r.tags : []
      for (const t of tags) {
        const k = String(t || '').toLowerCase()
        if (!k) continue
        map[k] = (map[k] || 0) + 1
      }
    }
    return Object.entries(map).map(([tag, count]) => ({ tag, count }))
  }
}
async function renderChart() {
  const rows = await loadTagRows()
  const labels = rows.map((r) => r.tag)
  const data = rows.map((r) => r.count)
  const { Chart } = await import('chart.js/auto')
  if (chart) chart.destroy()
  chart = new Chart(chartEl.value, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Recipes', data }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: true, position: 'top' } },
      layout: { padding: 8 },
      scales: { x: { ticks: { autoSkip: true, maxRotation: 0 } } },
    },
  })
}
async function reloadChart() {
  await renderChart()
}

const subject = ref('Newsletter')
const html = ref('<p>Hello from the Nutrition team!</p>')
const toText = ref('')
const sending = ref(false)
const err = ref('')
const ok = ref(false)
const sentCount = ref(0)

async function sendBulk() {
  err.value = ''
  ok.value = false
  const to = toText.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!to.length) {
    err.value = 'Add at least one recipient'
    return
  }
  try {
    sending.value = true
    const r = await callSendBulkEmail({ subject: subject.value, html: html.value, to })
    ok.value = true
    sentCount.value = r.count || to.length
  } catch (e) {
    err.value = e?.message || 'Send failed'
  } finally {
    sending.value = false
  }
}

const fileEl = ref(null)
const importMsg = ref('')
const importErr = ref('')

function triggerImport() {
  importMsg.value = ''
  importErr.value = ''
  if (fileEl.value) fileEl.value.click()
}
async function onImportFile(ev) {
  importMsg.value = ''
  importErr.value = ''
  try {
    const file = ev.target && ev.target.files && ev.target.files[0] ? ev.target.files[0] : null
    if (!file) return
    const text = await file.text()
    const arr = JSON.parse(text)
    if (!Array.isArray(arr)) throw new Error('Invalid JSON: expected an array of recipes')
    const cleaned = arr.map((r) => ({
      id: r.id || String(Math.random()).slice(2),
      title: String(r.title || ''),
      minutes: Number(r.minutes || 0),
      tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
      instructions: String(r.instructions || ''),
      status: 'approved',
    }))
    const existing = safeParse(LS_RECIPES, [])
    const merged = mergeById(existing, cleaned)
    localStorage.setItem(LS_RECIPES, JSON.stringify(merged))
    importMsg.value = `Imported ${cleaned.length} recipes`
    recalc()
    await reloadChart()
  } catch (e) {
    importErr.value = e?.message || 'Import failed'
  } finally {
    if (fileEl.value) fileEl.value.value = ''
  }
}
function mergeById(a, b) {
  const byId = new Map(a.map((x) => [x.id, x]))
  for (const r of b) {
    const prev = byId.get(r.id)
    byId.set(r.id, prev ? { ...prev, ...r } : { ...r })
  }
  return Array.from(byId.values())
}

let filteredRows = null
function onFilteredEvent(ev) {
  const rows = ev && ev.detail ? ev.detail : null
  if (Array.isArray(rows)) filteredRows = rows
}
function initFilteredListener() {
  window.addEventListener('ph_admin_recipes_filtered', onFilteredEvent)
}
function removeFilteredListener() {
  window.removeEventListener('ph_admin_recipes_filtered', onFilteredEvent)
}
function exportFiltered() {
  const rows =
    Array.isArray(filteredRows) && filteredRows.length ? filteredRows : safeParse(LS_RECIPES, [])
  const csv = toCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'recipes.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
function toCSV(rows) {
  const cols = ['id', 'title', 'minutes', 'tags', 'ingredients', 'instructions', 'status']
  const head = cols.join(',')
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          let v = r[c]
          if (Array.isArray(v)) v = v.join('|')
          v = v == null ? '' : String(v)
          if (/[,"\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"'
          return v
        })
        .join(','),
    )
    .join('\n')
  return head + '\n' + body
}
</script>

<style scoped>
.kpi-card {
  background: rgba(250, 248, 246, 0.8);
  border: 1px solid var(--bs-border-color);
}
.truncate {
  max-width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.list-group-item {
  background-color: var(--bs-body-bg);
}

.chart-box {
  height: 280px;
  max-height: 280px;
  width: 100%;
  overflow: hidden;
  background: var(--bs-body-bg);
}
.chart-box canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>
