<!-- src/components/AdminRecipesTable.vue -->
<template>
  <div class="admin-recipes">
    <!-- Toolbar -->
    <div class="p-3 rounded-3 border bg-body mb-3">
      <div class="row g-2 align-items-end">
        <div class="col-12 col-md-4">
          <label class="form-label small text-muted">Search</label>
          <input v-model.trim="q" class="form-control" placeholder="title, tag, ingredient…" />
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small text-muted">Sort</label>
          <select v-model="sortBy" class="form-select">
            <option value="title">Title</option>
            <option value="minutes">Time</option>
            <option value="status">Status</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small text-muted">Status</label>
          <select v-model="statusFilter" class="form-select">
            <option value="">Any</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="discarded">Discarded</option>
          </select>
        </div>

        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" type="button" @click="openNew">+ New recipe</button>
          <button class="btn btn-outline-secondary" type="button" @click="importFromJson">
            Import from recipes.json (replace)
          </button>
          <button class="btn btn-outline-danger ms-auto" type="button" @click="clearAll">
            Clear all admin recipes
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive border rounded-3">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th style="width: 36px">#</th>
            <th>Title</th>
            <th style="width: 100px">Time</th>
            <th>Tags</th>
            <th style="width: 120px">Status</th>
            <th style="width: 250px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in paged" :key="r.id">
            <td>{{ i1 + i }}</td>
            <td class="text-truncate" style="max-width: 280px">{{ r.title }}</td>
            <td>{{ r.minutes || 0 }} min</td>
            <td>
              <span v-for="t in r.tags" :key="t" class="badge text-bg-secondary me-1">{{ t }}</span>
            </td>
            <td>
              <span
                class="badge"
                :class="{
                  'text-bg-success': r.status === 'approved',
                  'text-bg-warning': r.status === 'pending',
                  'text-bg-danger': r.status === 'discarded',
                }"
              >
                {{ r.status || 'pending' }}
              </span>
            </td>
            <td>
              <div class="d-flex flex-wrap gap-1">
                <button class="btn btn-sm btn-outline-primary" type="button" @click="edit(r)">
                  Edit
                </button>
                <button class="btn btn-sm btn-outline-success" type="button" @click="approve(r)">
                  Approve
                </button>
                <button class="btn btn-sm btn-outline-secondary" type="button" @click="discard(r)">
                  Discard
                </button>
                <button class="btn btn-sm btn-outline-danger" type="button" @click="remove(r.id)">
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!paged.length">
            <td colspan="6" class="text-muted text-center py-3">No recipes</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pager -->
    <div class="d-flex align-items-center gap-2 mt-2">
      <span class="small text-muted">Rows: {{ filtered.length }}</span>
      <div class="ms-auto d-flex gap-1">
        <button class="btn btn-sm btn-outline-secondary" :disabled="page === 1" @click="page--">
          Prev
        </button>
        <span class="btn btn-sm btn-light disabled">Page {{ page }} / {{ pages }}</span>
        <button class="btn btn-sm btn-outline-secondary" :disabled="page === pages" @click="page++">
          Next
        </button>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modal.open" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="h6 mb-0">{{ modal.id ? 'Edit Recipe' : 'New Recipe' }}</h3>
          <button class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2">
            <div class="col-12">
              <label class="form-label">Title</label>
              <input v-model.trim="modal.title" class="form-control" required />
            </div>
            <div class="col-6">
              <label class="form-label">Minutes</label>
              <input v-model.number="modal.minutes" type="number" min="0" class="form-control" />
            </div>
            <div class="col-6">
              <label class="form-label">Status</label>
              <select v-model="modal.status" class="form-select">
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="discarded">discarded</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label">Tags (comma separated)</label>
              <input v-model.trim="modal.tagsCsv" class="form-control" />
            </div>
            <div class="col-12">
              <label class="form-label">Ingredients (one per line)</label>
              <textarea
                v-model.trim="modal.ingredientsTxt"
                rows="4"
                class="form-control"
              ></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">Instructions</label>
              <textarea v-model.trim="modal.instructions" rows="4" class="form-control"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer d-flex gap-2">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="saveModal">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import seed from '../data/recipes.json'

const LS_KEY = 'ph_admin_recipes'

/* ---------- util ---------- */
function sanitize(s) {
  return String(s || '').replace(/[<>]/g, (c) => ({ '<': '&lt;', '>': '&gt;' })[c])
}
function safeParse(key, fb) {
  try {
    const r = localStorage.getItem(key)
    return r ? JSON.parse(r) : fb
  } catch {
    return fb
  }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

/* ---------- state ---------- */
const rows = ref(safeParse(LS_KEY, []))

/* hydrate from seed if empty (one-time helper) */
if (!Array.isArray(rows.value) || rows.value.length === 0) {
  rows.value = (Array.isArray(seed) ? seed : []).map((r) => ({
    id: r.id ?? Date.now() + Math.random(),
    title: sanitize(r.title),
    minutes: Number(r.minutes || 0),
    tags: Array.isArray(r.tags) ? r.tags.map((t) => String(t)) : [],
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(sanitize) : [],
    instructions: sanitize(r.instructions),
    status: 'approved', // default seed as approved
  }))
}

/* persist on change */
watch(rows, (v) => save(LS_KEY, v), { deep: true })

/* ---------- filters/sort/paging ---------- */
const q = ref('')
const statusFilter = ref('')
const sortBy = ref('title')
const page = ref(1)
const pageSize = 10

const filtered = computed(() => {
  const query = q.value.toLowerCase()
  return rows.value.filter((r) => {
    if (statusFilter.value && r.status !== statusFilter.value) return false
    if (!query) return true
    const hay =
      `${r.title} ${(r.tags || []).join(' ')} ${(r.ingredients || []).join(' ')} ${r.instructions}`.toLowerCase()
    return hay.includes(query)
  })
})

const sorted = computed(() => {
  const list = [...filtered.value]
  const by = sortBy.value
  list.sort((a, b) => {
    if (by === 'minutes') return (a.minutes || 0) - (b.minutes || 0)
    if (by === 'status') return String(a.status || '').localeCompare(String(b.status || ''))
    return String(a.title || '').localeCompare(String(b.title || ''))
  })
  return list
})

const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize)))
const i1 = computed(() => (page.value - 1) * pageSize + 1)
const paged = computed(() => {
  const start = (page.value - 1) * pageSize
  return sorted.value.slice(start, start + pageSize)
})

watch([filtered, sortBy], () => {
  page.value = 1
})

/* ---------- actions ---------- */
const modal = reactive({
  open: false,
  id: null,
  title: '',
  minutes: 0,
  tagsCsv: '',
  ingredientsTxt: '',
  instructions: '',
  status: 'pending',
})

function openNew() {
  Object.assign(modal, {
    open: true,
    id: null,
    title: '',
    minutes: 0,
    tagsCsv: '',
    ingredientsTxt: '',
    instructions: '',
    status: 'pending',
  })
}
function edit(r) {
  Object.assign(modal, {
    open: true,
    id: r.id,
    title: r.title,
    minutes: r.minutes || 0,
    tagsCsv: (r.tags || []).join(','),
    ingredientsTxt: (r.ingredients || []).join('\n'),
    instructions: r.instructions || '',
    status: r.status || 'pending',
  })
}
function closeModal() {
  modal.open = false
}

function saveModal() {
  const rec = {
    id: modal.id ?? Date.now() + Math.random(),
    title: sanitize(modal.title),
    minutes: Number(modal.minutes || 0),
    tags: (modal.tagsCsv || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(sanitize),
    ingredients: (modal.ingredientsTxt || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(sanitize),
    instructions: sanitize(modal.instructions),
    status: modal.status || 'pending',
  }
  if (!rec.title) return

  const idx = rows.value.findIndex((x) => x.id === rec.id)
  if (idx >= 0) rows.value[idx] = rec
  else rows.value.unshift(rec)

  modal.open = false
  emitChanged()
}
function approve(r) {
  r.status = 'approved'
  emitChanged()
}
function discard(r) {
  r.status = 'discarded'
  emitChanged()
}
function remove(id) {
  rows.value = rows.value.filter((x) => x.id !== id)
  emitChanged()
}

function clearAll() {
  if (confirm('Clear all admin recipes?')) {
    rows.value = []
    emitChanged()
  }
}

/* Replace admin list with recipes.json content */
function importFromJson() {
  if (!Array.isArray(seed) || seed.length === 0) return
  if (!confirm('Replace admin recipes with recipes.json content?')) return
  rows.value = seed.map((r) => ({
    id: r.id ?? Date.now() + Math.random(),
    title: sanitize(r.title),
    minutes: Number(r.minutes || 0),
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(sanitize) : [],
    instructions: sanitize(r.instructions),
    status: 'approved',
  }))
  emitChanged()
}

/* raises "changed" so Dashboard can recalc KPI */
function emitChanged() {
  emit('changed')
}
const emit = defineEmits(['changed'])
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 1000;
}
.modal-card {
  width: min(920px, 96vw);
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.25);
}
.modal-header,
.modal-footer {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}
.modal-footer {
  border-top: 1px solid var(--bs-border-color);
  border-bottom: 0;
}
.modal-body {
  padding: 1rem;
}
.btn-close {
  border: none;
  background: transparent;
}
</style>
