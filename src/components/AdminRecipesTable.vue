<template>
  <div class="admin-recipes">
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

          <button class="btn btn-outline-dark ms-auto" type="button" @click="exportCsv">
            Export (filtered) CSV
          </button>

          <button class="btn btn-outline-danger" type="button" @click="clearAllLocal" v-if="!isFb">
            Clear local recipes
          </button>
        </div>
      </div>
    </div>

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
                >{{ r.status || 'pending' }}</span
              >
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
                <button
                  class="btn btn-sm btn-outline-danger"
                  type="button"
                  @click="removeRow(r.id)"
                >
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
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import seed from '@/data/recipes.json'
import {
  listenRecipes,
  upsertRecipe,
  deleteRecipe,
  replaceAll,
  isFirebaseMode,
} from '@/store/recipesRepo'
import { downloadCsv } from '@/utils/ExportHelpers'

const isFb = isFirebaseMode()

// live list (Firestore or local)
const rows = ref([])
let unlisten = null
onMounted(async () => {
  unlisten = await listenRecipes((list) => (rows.value = list))
})
onBeforeUnmount(() => {
  if (typeof unlisten === 'function') unlisten()
})

function sanitize(s) {
  return String(s || '').replace(/[<>]/g, (c) => ({ '<': '&lt;', '>': '&gt;' })[c])
}

// filters/sort/paging
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
const paged = computed(() =>
  sorted.value.slice((page.value - 1) * pageSize, (page.value - 1) * pageSize + pageSize),
)
watch([filtered, sortBy], () => {
  page.value = 1
})

// modal
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

async function saveModal() {
  const rec = {
    id: modal.id ?? undefined,
    title: sanitize(modal.title),
    minutes: Number(modal.minutes || 0),
    tags: (modal.tagsCsv || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    ingredients: (modal.ingredientsTxt || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    instructions: sanitize(modal.instructions),
    status: modal.status || 'pending',
  }
  if (!rec.title) return
  await upsertRecipe(rec)
  modal.open = false
}

async function approve(r) {
  await upsertRecipe({ ...r, status: 'approved' })
}
async function discard(r) {
  await upsertRecipe({ ...r, status: 'discarded' })
}
async function removeRow(id) {
  if (confirm('Delete this recipe?')) await deleteRecipe(id)
}

async function importFromJson() {
  if (!Array.isArray(seed) || !seed.length) return
  if (!confirm('Replace recipes with recipes.json content?')) return
  await replaceAll(seed)
}

// CSV export of current filter
function exportCsv() {
  const rowsCsv = filtered.value.map((r) => ({
    id: r.id,
    title: r.title,
    minutes: r.minutes,
    status: r.status,
    tags: (r.tags || []).join('|'),
  }))
  if (rowsCsv.length) downloadCsv(rowsCsv, 'recipes.csv')
}

function clearAllLocal() {
  if (!isFb && confirm('Clear local recipes?')) {
    localStorage.setItem('ph_admin_recipes', '[]')
    rows.value = []
  }
}
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
