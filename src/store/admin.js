// src/store/admin.js
// LocalStorage-backed admin data + CRUD (no external setup)

import { reactive, computed } from 'vue'

// ---- LocalStorage helpers ----
const LS_USERS = 'ph_admin_users'
const LS_RECIPES = 'ph_admin_recipes'

function load(key, fb) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fb
  } catch {
    return fb
  }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// ---- Seed once if empty ----
const seedUsers = [
  {
    id: 1,
    email: 'admin@publichealth.test',
    name: 'Admin',
    role: 'admin',
    enabled: true,
    createdAt: Date.now(),
  },
  {
    id: 2,
    email: 'user1@example.com',
    name: 'Ava',
    role: 'user',
    enabled: true,
    createdAt: Date.now(),
  },
  {
    id: 3,
    email: 'user2@example.com',
    name: 'Noah',
    role: 'user',
    enabled: true,
    createdAt: Date.now(),
  },
]
const seedRecipes = [
  {
    id: 101,
    title: 'Chickpea Salad',
    minutes: 15,
    tags: ['vegan', 'quick'],
    approved: true,
    createdBy: 2,
    createdAt: Date.now(),
    reviews: [{ rating: 5 }, { rating: 4 }],
  },
  {
    id: 102,
    title: 'Baked Oats',
    minutes: 25,
    tags: ['vegetarian'],
    approved: false,
    createdBy: 3,
    createdAt: Date.now(),
    reviews: [{ rating: 3 }],
  },
]

const state = reactive({
  users: load(LS_USERS, seedUsers),
  recipes: load(LS_RECIPES, seedRecipes),
})

// persist whenever arrays are replaced
function persist() {
  save(LS_USERS, state.users)
  save(LS_RECIPES, state.recipes)
}

// ---- USERS CRUD ----
const usersCount = computed(() => state.users.length)
function addUser(u) {
  const id = Math.max(0, ...state.users.map((x) => x.id)) + 1
  state.users = [...state.users, { ...u, id, createdAt: Date.now() }]
  persist()
}
function updateUser(id, patch) {
  state.users = state.users.map((u) => (u.id === id ? { ...u, ...patch } : u))
  persist()
}
function deleteUser(id) {
  state.users = state.users.filter((u) => u.id !== id)
  // cascade delete or reassign createdBy if you want; we’ll just keep as-is
  persist()
}

// ---- RECIPES CRUD ----
const recipesCount = computed(() => state.recipes.length)
function addRecipe(r) {
  const id = Math.max(0, ...state.recipes.map((x) => x.id)) + 1
  state.recipes = [...state.recipes, { ...r, id, createdAt: Date.now(), reviews: r.reviews || [] }]
  persist()
}
function updateRecipe(id, patch) {
  state.recipes = state.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r))
  persist()
}
function deleteRecipe(id) {
  state.recipes = state.recipes.filter((r) => r.id !== id)
  persist()
}

export const adminStore = {
  state,
  usersCount,
  recipesCount,
  // users
  addUser,
  updateUser,
  deleteUser,
  // recipes
  addRecipe,
  updateRecipe,
  deleteRecipe,
}
