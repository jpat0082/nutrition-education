<template>
  <div class="p-3 p-md-4 bg-body border rounded-3 mb-3">
    <div class="row gy-3 align-items-center">
      <div class="col-12 col-md-6 col-lg-4">
        <label class="form-label small text-muted mb-1"
          >Search (title, ingredients, instructions)</label
        >
        <input v-model.trim="q" class="form-control" placeholder="e.g., chicken, soup, basil…" />
      </div>

      <div class="col-12 col-md-6 col-lg-4">
        <label class="form-label small text-muted mb-1">Tags</label>
        <div class="d-flex flex-wrap gap-2">
          <button
            v-for="t in allTags"
            :key="t"
            class="btn btn-sm"
            :class="selectedTags.has(t) ? 'btn-success' : 'btn-outline-secondary'"
            @click="toggleTag(t)"
            :aria-pressed="selectedTags.has(t)"
            type="button"
          >
            {{ t }}
          </button>
        </div>
      </div>

      <div class="col-6 col-md-3 col-lg-2">
        <label class="form-label small text-muted mb-1">Min rating</label>
        <select v-model.number="minRating" class="form-select">
          <option :value="0">Any</option>
          <option v-for="n in 5" :key="n" :value="n">{{ n }}+</option>
        </select>
      </div>

      <div class="col-6 col-md-3 col-lg-2">
        <label class="form-label small text-muted mb-1">Sort</label>
        <div class="d-flex gap-2">
          <select v-model="sortBy" class="form-select">
            <option value="title">Title (A–Z)</option>
            <option value="minutes">Time (asc)</option>
            <option value="rating">Rating</option>
          </select>
          <button
            class="btn btn-outline-secondary"
            @click="toggleDir"
            :title="`Order: ${sortDir}`"
            type="button"
          >
            {{ sortDir === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
      </div>

      <div class="col-12 d-flex align-items-center gap-3">
        <div class="form-check">
          <input id="favOnly" class="form-check-input" type="checkbox" v-model="favsOnly" />
          <label for="favOnly" class="form-check-label">Favourites only</label>
        </div>
        <button class="btn btn-sm btn-outline-dark" @click="resetFilters" type="button">
          Reset filters
        </button>
        <button
          class="btn btn-sm btn-outline-primary ms-auto"
          @click="printRecipes"
          title="Print friendly"
          type="button"
        >
          Print
        </button>
      </div>
    </div>
  </div>

  <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
    <div class="col" v-for="r in filteredSorted" :key="r.id">
      <RecipeCard
        :recipe="r"
        :isFav="favSet.has(r.id)"
        :searchTerm="q"
        class="h-100 card-hover"
        @reviewed="onReviewed"
        @toggle-fav="onToggleFav"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import RecipeCard from './RecipeCard.vue'
import data from '../data/recipes.json'

const LS_REVIEWS = 'ne_reviews'
const LS_FAVS = 'ne_favs'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

const reviewsMap = ref(load(LS_REVIEWS, {}))
const favSet = ref(new Set(load(LS_FAVS, [])))

const recipes = ref(
  (Array.isArray(data) ? data : []).map((r) => ({
    ...r,
    reviews: Array.isArray(reviewsMap.value[r.id]) ? reviewsMap.value[r.id] : [],
  })),
)

const q = ref('')
const selectedTags = ref(new Set())
const minRating = ref(0)
const sortBy = ref('title')
const sortDir = ref('asc')
const favsOnly = ref(false)

function avgFor(r) {
  const list = r.reviews || []
  if (!list.length) return 0
  return list.reduce((a, b) => a + Number(b.rating || 0), 0) / list.length
}

const allTags = computed(() => {
  const s = new Set()
  for (const r of recipes.value) (r.tags || []).forEach((t) => s.add(String(t)))
  return Array.from(s).sort((a, b) => a.localeCompare(b))
})

function toggleTag(t) {
  const set = new Set(selectedTags.value)
  if (set.has(t)) set.delete(t)
  else set.add(t)
  selectedTags.value = set
}

function matchesSearch(r) {
  const query = (q.value || '').toLowerCase()
  if (!query) return true
  const hayTitle = (r.title || '').toLowerCase()
  const hayIngr = (r.ingredients || []).join(' ').toLowerCase()
  const hayInstr = (r.instructions || '').toLowerCase()
  return hayTitle.includes(query) || hayIngr.includes(query) || hayInstr.includes(query)
}

function matchesTags(r) {
  if (!selectedTags.value.size) return true
  const t = new Set((r.tags || []).map((x) => String(x)))
  for (const need of selectedTags.value) if (!t.has(need)) return false
  return true
}

function matchesRating(r) {
  if (!minRating.value) return true
  return avgFor(r) >= Number(minRating.value)
}

function matchesFav(r) {
  return !favsOnly.value || favSet.value.has(r.id)
}

const filteredSorted = computed(() => {
  const list = recipes.value.filter(
    (r) => matchesSearch(r) && matchesTags(r) && matchesRating(r) && matchesFav(r),
  )

  const dir = sortDir.value === 'asc' ? 1 : -1
  const key = sortBy.value

  list.sort((a, b) => {
    if (key === 'title') return a.title.localeCompare(b.title) * dir
    if (key === 'minutes') return ((a.minutes || 0) - (b.minutes || 0)) * dir
    if (key === 'rating') return (avgFor(a) - avgFor(b)) * dir
    return 0
  })
  return list
})

function toggleDir() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

function resetFilters() {
  q.value = ''
  selectedTags.value = new Set()
  minRating.value = 0
  sortBy.value = 'title'
  sortDir.value = 'asc'
  favsOnly.value = false
}

function onReviewed(payload) {
  const id = payload?.id
  const review = payload?.review
  if (!id || !review) return

  const idx = recipes.value.findIndex((r) => r.id === id)
  if (idx < 0) return

  const current = Array.isArray(recipes.value[idx].reviews) ? [...recipes.value[idx].reviews] : []

  if (Object.prototype.hasOwnProperty.call(review, '__deleteIndex')) {
    const del = Number(review.__deleteIndex)
    if (!Number.isNaN(del) && del >= 0 && del < current.length) current.splice(del, 1)
  } else {
    current.push(review)
  }

  recipes.value[idx] = { ...recipes.value[idx], reviews: current }

  const map = { ...reviewsMap.value, [id]: current }
  reviewsMap.value = map
  save(LS_REVIEWS, map)
}

function onToggleFav(id) {
  const s = new Set(favSet.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  favSet.value = s
  save(LS_FAVS, Array.from(s))
}

function printRecipes() {
  const toPrint = filteredSorted.value
  const rows = toPrint
    .map((r) => {
      const tags = (r.tags || []).map((t) => '<span class="tag">' + String(t) + '</span>').join('')
      const ings = (r.ingredients || []).map((i) => '<li>' + String(i) + '</li>').join('')
      const meta = '~' + String(r.minutes || 0) + ' min · Avg ' + avgFor(r).toFixed(1) + '/5'
      return (
        '<div class="card">' +
        '<h2>' +
        String(r.title) +
        '</h2>' +
        '<div class="meta">' +
        meta +
        '</div>' +
        '<div>' +
        tags +
        '</div>' +
        '<h3>Ingredients</h3>' +
        '<ul>' +
        ings +
        '</ul>' +
        '<h3>Instructions</h3>' +
        '<p>' +
        String(r.instructions || '') +
        '</p>' +
        '</div>'
      )
    })
    .join('')

  const html =
    '<!doctype html>' +
    '<html><head><meta charset="utf-8"/><title>Recipes (Print)</title>' +
    '<style>' +
    'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px}' +
    'h1{margin:0 0 16px}h2{margin:16px 0 8px}' +
    '.meta{color:#666;font-size:12px;margin-bottom:6px}' +
    '.tag{display:inline-block;border:1px solid #ddd;border-radius:14px;padding:2px 8px;margin-right:6px;font-size:12px}' +
    '.card{break-inside:avoid;page-break-inside:avoid;border:1px solid #eee;border-radius:12px;padding:12px;margin:12px 0}' +
    '</style></head><body>' +
    '<h1>Recipe List (Filtered)</h1>' +
    rows +
    '<script>window.onload=()=>window.print()</' +
    'script>' +
    '</body></html>'

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
</script>

<style scoped>
.filter-bar {
  position: sticky;
  top: 0.75rem;
  z-index: 10;
}
.card-hover {
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
}
</style>
