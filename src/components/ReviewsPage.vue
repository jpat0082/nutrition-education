<template>
  <div>
    <div class="d-flex justify-content-between align-items-center">
      <h4 class="h6 mb-0">Community Reviews</h4>
      <span class="small">
        Avg Rating:
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

    <form @submit.prevent="submit" class="border rounded p-2">
      <div class="mb-2">
        <label class="form-label">Rating (1-5)</label>
        <input
          v-model.number="rating"
          type="number"
          class="form-control"
          min="1"
          max="5"
          required
        />
        <div class="form-text">Validation: required + numeric range (1-5)</div>
      </div>
      <div class="mb-2">
        <label class="form-label">Comment</label>
        <textarea
          v-model.trim="comment"
          class="form-control"
          rows="2"
          required
          minlength="5"
        ></textarea>
        <div class="form-text">Validation: required + min length</div>
      </div>
      <button class="btn btn-outline-primary btn-sm">Add Review</button>
      <p class="text-danger small mt-2 mb-0" v-if="err">{{ err }}</p>
    </form>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { auth } from '../store/auth.js'
import { sanitize } from '../utils/sanitize.js'

const props = defineProps({
  recipeId: { type: Number, required: true },
  reviews: { type: Array, required: true },
})
const emit = defineEmits(['reviewed'])

const rating = ref(5)
const comment = ref('')
const err = ref('')

const avg = computed(() => {
  if (!props.reviews.length) return 0
  const s = props.reviews.reduce((a, b) => a + Number(b.rating || 0), 0)
  return s / props.reviews.length
})

function submit() {
  err.value = ''
  const user = auth.currentUser()
  if (!user) {
    err.value = 'Please login to review.'
    return
  }
  const ratingNum = Number(rating.value)
  if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    err.value = 'Rating must be between 1 and 5.'
    return
  }
  if (comment.value.length < 5) {
    err.value = 'Comment is too short.'
    return
  }

  emit('reviewed', {
    id: props.recipeId,
    review: { name: user.name, rating: ratingNum, commentSafe: sanitize(comment.value) },
  })
  rating.value = 5
  comment.value = ''
}
</script>
