<!-- src/components/AdminDashboardPage.vue -->
<template>
  <div class="admin bg-light-subtle p-3 rounded-3 shadow-sm">
    <!-- Header -->
    <section class="p-3 p-md-4 rounded-3 mb-3 bg-white shadow-sm">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <h1 class="h4 mb-0 text-primary">Admin Dashboard</h1>
        <span class="badge bg-dark text-uppercase">admin</span>
        <span class="ms-auto small text-muted">Local mode (demo)</span>
      </div>
      <p class="text-muted mb-0">
        Moderate recipes and manage users. Changes persist in this browser.
      </p>
    </section>

    <!-- KPIs -->
    <section class="mb-3">
      <div class="row g-3">
        <div class="col-md-4" v-for="c in kpiCards" :key="c.title">
          <div class="p-3 rounded-3 shadow-sm kpi-card h-100">
            <div class="small text-muted">{{ c.title }}</div>
            <div class="display-6 fw-semibold">{{ c.value }}</div>
            <div class="small text-muted">{{ c.note }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick actions -->
    <section class="mb-3">
      <div class="p-3 rounded-3 bg-white border shadow-sm d-flex flex-wrap gap-2">
        <button class="btn btn-sm btn-outline-danger" @click="clearOnly('recipes')">
          Clear Recipes
        </button>
        <button class="btn btn-sm btn-outline-danger" @click="clearOnly('users')">
          Clear Users
        </button>
        <button class="btn btn-sm btn-outline-secondary ms-auto" @click="recalc">
          Recalculate KPIs
        </button>
      </div>
    </section>

    <!-- Tabs -->
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

    <!-- Panels -->
    <div v-show="tab === 'recipes'" class="bg-white p-3 rounded-3 shadow-sm mb-3">
      <AdminRecipesTable @changed="recalc" />
    </div>
    <div v-show="tab === 'users'" class="bg-white p-3 rounded-3 shadow-sm mb-3">
      <AdminUsersTable @changed="recalc" />
    </div>

    <!-- Recent users -->
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
import { reactive, ref, onMounted, onBeforeUnmount, computed } from 'vue'
import AdminRecipesTable from './AdminRecipesTable.vue'
import AdminUsersTable from './AdminUsersTable.vue'
import { listen, listUsers } from '@/store/userRegistry'

/**
 * Keys used elsewhere in your app:
 *  - AdminRecipesTable persists recipes under 'ph_admin_recipes'
 *  - Public site reviews map is 'ne_reviews'
 */
const LS_RECIPES = 'ph_admin_recipes'
const LS_REVIEWS = 'ne_reviews'

/* ---------------- Tabs ---------------- */
const tab = ref('recipes')

/* ---------------- Users live-sync (userRegistry is the source of truth) ---------------- */
const users = ref(listUsers())
let unlisten = null
onMounted(() => {
  // live updates when AdminUsersTable or Register/Login change localStorage
  unlisten = listen((all) => {
    users.value = all
    // KPIs driven by users should update immediately
    kpi.users = all.length
    kpi.admins = all.filter((u) => u.role === 'admin').length
    kpi.disabled = all.filter((u) => u.disabled).length
  })
  // initial calculation for recipes/reviews
  recalc()
})
onBeforeUnmount(() => {
  if (unlisten) unlisten()
})

/* ---------------- KPI state ---------------- */
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
  // users-related KPIs updated via listen() above
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

function clearOnly(which) {
  if (which === 'recipes') {
    localStorage.removeItem(LS_RECIPES)
  } else if (which === 'users') {
    // User records are managed by userRegistry. Clear by writing empty array to the same key it uses.
    localStorage.setItem('ph_app_users', JSON.stringify([]))
    // users will refresh via listen() automatically
  }
  recalc()
}

/* ---------------- KPI cards model ---------------- */
const kpiCards = computed(() => [
  { title: 'Users', value: kpi.users, note: `Admins: ${kpi.admins} • Disabled: ${kpi.disabled}` },
  {
    title: 'Recipes',
    value: kpi.recipes,
    note: `Approved: ${kpi.approved} • Pending: ${kpi.pending}`,
  },
  { title: 'Reviews', value: kpi.reviews, note: 'From public site (read-only)' },
])
</script>

<style scoped>
/* Soft, warm “light skin tone” cards */
.kpi-card {
  background: rgba(250, 248, 246, 0.8); /* warm subtle */
  border: 1px solid var(--bs-border-color);
}

.truncate {
  max-width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Harmonize list items with light theme */
.list-group-item {
  background-color: var(--bs-body-bg);
}
</style>
