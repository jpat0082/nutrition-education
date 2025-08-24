<template>
  <div
    class="p-3 p-md-4 bg-white border rounded-3 mb-3 d-flex flex-wrap align-items-center justify-content-between"
  >
    <div>
      <h2 class="h4 mb-1">Healthy, Budget-Friendly Recipes</h2>
      <p class="text-muted mb-0">Realistic prep times • Wholefoods first • Community ratings</p>
    </div>
    <input
      v-model.trim="q"
      class="form-control w-auto mt-3 mt-md-0"
      placeholder="Search by title/tag..."
    />
  </div>

  <div class="row g-3">
    <div class="col-12 col-md-6 col-lg-4" v-for="r in filtered" :key="r.id">
      <RecipeCard :recipe="r" class="h-100 card-hover" @reviewed="onReviewed" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import RecipeCard from './RecipeCard.vue'
import data from '../data/recipes.json'

const LS_REVIEWS = 'ne_reviews'
function loadReviewsMap() {
  try {
    return JSON.parse(localStorage.getItem(LS_REVIEWS)) || {}
  } catch {
    return {}
  }
}
function saveReviewsMap(map) {
  localStorage.setItem(LS_REVIEWS, JSON.stringify(map))
}

const q = ref('')
const reviewsMap = ref(loadReviewsMap())

const recipes = ref(
  data.map((r) => ({
    ...r,
    reviews: Array.isArray(reviewsMap.value[r.id]) ? reviewsMap.value[r.id] : [],
  })),
)

const filtered = computed(() => {
  const query = q.value.toLowerCase()
  if (!query) return recipes.value
  return recipes.value.filter(
    (r) =>
      r.title.toLowerCase().includes(query) || r.tags.some((t) => t.toLowerCase().includes(query)),
  )
})

function onReviewed({ id, review }) {
  const i = recipes.value.findIndex((r) => r.id === id)
  if (i < 0) return
  if (typeof review.__deleteIndex === 'number') {
    recipes.value[i].reviews.splice(review.__deleteIndex, 1)
  } else {
    recipes.value[i].reviews.push(review)
  }
  reviewsMap.value[id] = recipes.value[i].reviews
  saveReviewsMap(reviewsMap.value)
}
</script>
