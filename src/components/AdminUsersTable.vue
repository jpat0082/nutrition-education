<template>
  <div class="admin-users">
    <div class="p-3 rounded-3 border bg-body mb-3">
      <div class="row g-2 align-items-end">
        <div class="col-12 col-md-4">
          <label class="form-label small text-muted">Search</label>
          <input v-model.trim="q" class="form-control" placeholder="name, email…" />
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small text-muted">Sort</label>
          <select v-model="sortBy" class="form-select">
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="role">Role</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary" type="button" @click="openNew">+ New user</button>
          <button class="btn btn-outline-secondary" type="button" @click="importFromSession">
            Import from current session
          </button>
          <button class="btn btn-outline-danger ms-auto" type="button" @click="clearAll">
            Clear all users
          </button>
        </div>
      </div>
    </div>

    <div class="table-responsive border rounded-3">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th style="width: 36px">#</th>
            <th>Name</th>
            <th>Email</th>
            <th style="width: 120px">Role</th>
            <th style="width: 110px">Status</th>
            <th style="width: 260px">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(u, i) in paged" :key="u.id">
            <td>{{ i1 + i }}</td>
            <td class="text-truncate" style="max-width: 200px">{{ u.name }}</td>
            <td class="text-truncate" style="max-width: 260px">{{ u.email }}</td>
            <td>
              <span class="badge text-bg-secondary text-uppercase">{{ u.role }}</span>
            </td>
            <td>
              <span class="badge" :class="u.disabled ? 'text-bg-danger' : 'text-bg-success'">
                {{ u.disabled ? 'disabled' : 'active' }}
              </span>
            </td>
            <td>
              <div class="d-flex flex-wrap gap-1">
                <button class="btn btn-sm btn-outline-primary" @click="edit(u)" type="button">
                  Edit
                </button>
                <button class="btn btn-sm btn-outline-dark" @click="toggle(u)" type="button">
                  {{ u.disabled ? 'Enable' : 'Disable' }}
                </button>
                <button class="btn btn-sm btn-outline-warning" @click="roleSwap(u)" type="button">
                  Make {{ u.role === 'admin' ? 'User' : 'Admin' }}
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="removeRow(u)" type="button">
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!paged.length">
            <td colspan="6" class="text-muted text-center py-3">No users</td>
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
          <h3 class="h6 mb-0">{{ modal.id ? 'Edit User' : 'New User' }}</h3>
          <button class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2">
            <div class="col-12 col-md-6">
              <label class="form-label">Name</label>
              <input v-model.trim="modal.name" class="form-control" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Email</label>
              <input v-model.trim="modal.email" class="form-control" type="email" required />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Role</label>
              <select v-model="modal.role" class="form-select">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label">Status</label>
              <select v-model="modal.disabledStr" class="form-select">
                <option value="0">active</option>
                <option value="1">disabled</option>
              </select>
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Password</label>
              <input v-model="modal.password" class="form-control" type="text" />
              <div class="form-text">Default is <code>1234</code> if left blank.</div>
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
import {
  listUsers,
  upsertUser,
  removeUser,
  toggleDisabled,
  setRole,
  listen,
} from '@/store/userRegistry'

function sanitize(s) {
  return String(s || '').replace(/[<>]/g, (m) => ({ '<': '&lt;', '>': '&gt;' })[m])
}

const rows = ref(listUsers())

let unlisten = null
onMounted(() => {
  unlisten = listen((all) => {
    rows.value = all
  })
})
onBeforeUnmount(() => {
  if (unlisten) unlisten()
})

const q = ref('')
const sortBy = ref('name')
const page = ref(1)
const pageSize = 10

const filtered = computed(() => {
  const query = q.value.toLowerCase()
  return rows.value.filter((u) => {
    if (!query) return true
    const hay = `${u.name} ${u.email}`.toLowerCase()
    return hay.includes(query)
  })
})
const sorted = computed(() => {
  const list = [...filtered.value]
  const by = sortBy.value
  list.sort((a, b) => {
    if (by === 'email') return String(a.email || '').localeCompare(String(b.email || ''))
    if (by === 'role') return String(a.role || '').localeCompare(String(b.role || ''))
    if (by === 'status') return Number(!!a.disabled) - Number(!!b.disabled)
    return String(a.name || '').localeCompare(String(b.name || ''))
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

const modal = reactive({
  open: false,
  id: null,
  name: '',
  email: '',
  role: 'user',
  disabledStr: '0',
  password: '',
})
function openNew() {
  Object.assign(modal, {
    open: true,
    id: null,
    name: '',
    email: '',
    role: 'user',
    disabledStr: '0',
    password: '',
  })
}
function edit(u) {
  Object.assign(modal, {
    open: true,
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    disabledStr: u.disabled ? '1' : '0',
    password: '',
  })
}
function closeModal() {
  modal.open = false
}

function saveModal() {
  if (!modal.email || !modal.name) return

  upsertUser({
    id: modal.id ?? undefined,
    name: sanitize(modal.name),
    email: sanitize(modal.email),
    role: modal.role,
    disabled: modal.disabledStr === '1',
    password: (modal.password && String(modal.password).trim()) || undefined,
  })

  rows.value = listUsers()
  modal.open = false
}

function toggle(u) {
  toggleDisabled(u.id)
  rows.value = listUsers()
}
function roleSwap(u) {
  setRole(u.id, u.role === 'admin' ? 'user' : 'admin')
  rows.value = listUsers()
}
function removeRow(u) {
  if (!confirm(`Delete ${u.email}?`)) return
  removeUser(u.id)
  rows.value = listUsers()
}

function clearAll() {
  if (!confirm('Clear ALL users? This cannot be undone.')) return
  localStorage.setItem('ph_app_users', JSON.stringify([]))
  rows.value = []
}

function importFromSession() {
  const email = localStorage.getItem('ph_last_email') || ''
  const name = localStorage.getItem('ph_last_user') || 'Imported User'
  if (!email) {
    alert('No remembered user found (ph_last_email).')
    return
  }
  upsertUser({ name, email, role: 'user', password: '1234', disabled: false })
  rows.value = listUsers()
}
</script>

<style scoped>
.table-responsive,
.border,
.modal-card {
  background: var(--bs-body-bg);
}
.admin-users :where(.bg-body) {
  background: rgba(250, 248, 246, 0.6);
}
.badge.text-bg-secondary {
  background-color: #c7c2ff !important;
}
.badge.text-bg-success {
  background-color: #b4f0c5 !important;
  color: #114 !important;
}
.badge.text-bg-danger {
  background-color: #ffd1d1 !important;
  color: #411 !important;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 1000;
}
.modal-card {
  width: min(720px, 96vw);
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
