<template>
  <div class="card h-100 card-hover">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start mb-1">
        <h3 class="h5 mb-0">{{ recipe.title }}</h3>
        <button
          class="btn btn-sm"
          :class="isFav ? 'btn-warning' : 'btn-outline-secondary'"
          @click="$emit('toggle-fav', recipe.id)"
          :aria-pressed="isFav"
          :title="isFav ? 'Remove from favourites' : 'Add to favourites'"
          type="button"
        >
          {{ isFav ? '★' : '☆' }}
        </button>
      </div>

      <p class="mb-2">
        <span v-for="t in recipe.tags" :key="t" class="badge text-bg-success me-1">{{ t }}</span>
      </p>

      <div class="d-flex justify-content-between align-items-center text-muted small mb-2">
        <span>~{{ recipe.minutes }} min</span>
        <span v-if="count > 0">Avg {{ avg.toFixed(1) }}/5 ({{ count }})</span>
        <span v-else>Not yet rated</span>
      </div>

      <div class="border rounded p-2 mb-2 small bg-body-tertiary">
        <strong>Nutrition (est.):</strong>
        <span class="ms-2">{{ nutrition.kcal }} kcal</span> ·
        <span>{{ nutrition.protein }}g protein</span> · <span>{{ nutrition.fat }}g fat</span> ·
        <span>{{ nutrition.carbs }}g carbs</span>
      </div>

      <details class="mb-2">
        <summary class="mb-1">Ingredients</summary>
        <ul class="mb-0">
          <li v-for="(ing, i) in recipe.ingredients" :key="i" v-html="highlight(ing)"></li>
        </ul>
      </details>

      <details class="mb-3">
        <summary class="mb-1">Instructions</summary>
        <p class="mb-0" v-html="highlight(recipe.instructions)"></p>
      </details>

      <div class="d-flex gap-2 mb-3">
        <button class="btn btn-sm btn-outline-primary" type="button" @click="speak">
          Speak steps
        </button>
        <button class="btn btn-sm btn-outline-secondary" type="button" @click="share">Share</button>
        <button class="btn btn-sm btn-outline-dark" type="button" @click="toggleQR">QR</button>
      </div>

      <div v-if="showQR" class="text-center mb-3">
        <div v-if="!qrDataUrl" class="small text-muted">Generating QR…</div>
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          alt="QR code"
          class="border rounded d-block mx-auto"
          width="160"
          height="160"
        />
        <div class="small text-muted mt-1">Scan to open this recipe</div>
      </div>

      <div class="mt-auto">
        <Reviews
          :recipeId="recipe.id"
          :reviews="recipe.reviews"
          @reviewed="$emit('reviewed', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Reviews from './ReviewsPage.vue'
import { estimateNutrition } from '../utils/nutrition.js'
import QRCode from 'qrcode'

const props = defineProps({
  recipe: { type: Object, required: true },
  isFav: { type: Boolean, default: false },
  searchTerm: { type: String, default: '' },
})

const count = computed(() => props.recipe.reviews?.length || 0)
const avg = computed(() =>
  count.value === 0
    ? 0
    : props.recipe.reviews.reduce((a, b) => a + Number(b.rating || 0), 0) / count.value,
)
const nutrition = computed(() => estimateNutrition(props.recipe.tags || []))

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function highlight(text) {
  const q = (props.searchTerm || '').trim()
  if (!q) return text
  const re = new RegExp(escapeReg(q), 'ig')
  return String(text).replace(re, (m) => `<mark>${m}</mark>`)
}

function speak() {
  const utter = new SpeechSynthesisUtterance(`${props.recipe.title}. ${props.recipe.instructions}`)
  utter.rate = 1.0
  utter.pitch = 1.0
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utter)
}

async function share() {
  const url = window.location.origin + '/recipes'
  const data = { title: props.recipe.title, text: 'Check out this recipe!', url }
  if (navigator.share) {
    try {
      await navigator.share(data)
    } catch {
      /* cancelled */
    }
  } else {
    try {
      await navigator.clipboard.writeText(`${props.recipe.title} - ${url}`)
      alert('Share link copied.')
    } catch {
      alert('Could not copy link.')
    }
  }
}

const showQR = ref(false)
const qrDataUrl = ref('')

function toggleQR() {
  showQR.value = !showQR.value
}

watch(showQR, async (v) => {
  if (!v) return
  try {
    const url = `${window.location.origin}/recipes#id-${props.recipe.id}`
    qrDataUrl.value = await QRCode.toDataURL(url, { width: 160 })
  } catch {
    qrDataUrl.value = ''
  }
})
</script>

<style scoped>
.card-hover {
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
}
details summary {
  cursor: pointer;
}
</style>
