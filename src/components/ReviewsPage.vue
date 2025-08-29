<template>
  <div>
    <div class="d-flex justify-content-between align-items-center">
      <h4 class="h6 mb-0">Community Reviews</h4>
      <span class="small">
        Avg:
        <strong v-if="reviews.length">{{ avg.toFixed(1) }}/5</strong>
        <span v-else>—</span>
      </span>
    </div>

    <ul class="list-unstyled mt-2 mb-3">
      <li v-for="(r, i) in reviews" :key="i" class="border rounded p-2 mb-2">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">{{ r.name }}</div>
            <p class="mb-0">{{ r.commentSafe }}</p>
          </div>
          <div class="ms-2 text-end">
            <span class="badge text-bg-primary mb-1">{{ r.rating }}/5</span>
            <button
              v-if="auth.currentUser()?.name === r.name"
              class="btn btn-sm btn-outline-danger w-100"
              @click="$emit('reviewed', { id: recipeId, review: { __deleteIndex: i } })"
              title="Delete your review"
            >
              Remove
            </button>
          </div>
        </div>
      </li>
    </ul>

    <form @submit.prevent="submit" class="border rounded p-2" novalidate>
      <div class="mb-2">
        <label class="form-label">Rating (1–5)</label>
        <input
          v-model.number="rating"
          type="number"
          class="form-control"
          :class="{ 'is-invalid': rating < 1 || rating > 5 }"
          min="1"
          max="5"
          required
        />
        <div class="invalid-feedback">Rating must be between 1 and 5.</div>
      </div>
      <div class="mb-2">
        <label class="form-label">Comment</label>
        <textarea
          v-model.trim="comment"
          class="form-control"
          :class="{ 'is-invalid': commentInvalid }"
          rows="2"
          required
          minlength="5"
          maxlength="250"
          placeholder="Helpful, respectful feedback (5–250 chars). No links."
        ></textarea>
        <div class="invalid-feedback">{{ commentError }}</div>
      </div>
      <button class="btn btn-outline-primary btn-sm" :disabled="cooldown">Add Review</button>
      <p class="text-danger small mt-2 mb-0" v-if="err" aria-live="polite" role="status">
        {{ err }}
      </p>
      <p class="text-muted small mt-2 mb-0" v-if="cooldown">
        Please wait a moment before posting again.
      </p>
    </form>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { auth } from '../store/auth.js'
import { sanitize } from '../utils/sanitize.js'
import { hasURL, hasProfanity } from '../utils/validation.js'

const props = defineProps({
  recipeId: { type: Number, required: true },
  reviews: { type: Array, required: true },
})
const emit = defineEmits(['reviewed'])

const rating = ref(5)
const comment = ref('')
const err = ref('')
const lastPost = ref(0)

const cooldown = computed(() => Date.now() - lastPost.value < 60_000)
const avg = computed(() =>
  !props.reviews.length
    ? 0
    : props.reviews.reduce((a, b) => a + Number(b.rating || 0), 0) / props.reviews.length,
)
const userHasReview = computed(() => {
  const u = auth.currentUser()
  if (!u) return false
  return props.reviews.some((r) => r.name === u.name)
})

const commentInvalid = computed(() => {
  const c = comment.value || ''
  return c.length < 5 || c.length > 250 || hasURL(c) || hasProfanity(c)
})
const commentError = computed(() => {
  const c = comment.value || ''
  if (c.length < 5) return 'Comment is too short (min 5).'
  if (c.length > 250) return 'Comment is too long (max 250).'
  if (hasURL(c)) return 'Links are not allowed.'
  if (hasProfanity(c)) return 'Please keep language respectful.'
  return 'Invalid comment.'
})

function submit() {
  err.value = ''
  if (cooldown.value) {
    err.value = 'Please wait before posting again.'
    return
  }
  const user = auth.currentUser()
  if (!user) {
    err.value = 'Please login to review.'
    return
  }
  if (userHasReview.value) {
    err.value = 'You have already reviewed this recipe.'
    return
  }
  const ratingNum = Number(rating.value)
  if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    err.value = 'Rating must be between 1 and 5.'
    return
  }
  if (commentInvalid.value) {
    err.value = commentError.value
    return
  }

  emit('reviewed', {
    id: props.recipeId,
    review: { name: user.name, rating: ratingNum, commentSafe: sanitize(comment.value) },
  })
  rating.value = 5
  comment.value = ''
  lastPost.value = Date.now()
}
</script>
