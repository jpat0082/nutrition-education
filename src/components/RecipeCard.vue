<template>
  <div class="card h-100">
    <div class="card-body d-flex flex-column">
      <h3 class="h5">{{ recipe.title }}</h3>
      <p class="mb-2">
        <span v-for="t in recipe.tags" :key="t" class="badge text-bg-success me-1">{{ t }}</span>
      </p>
      <p class="small text-muted mb-2">~{{ recipe.minutes }} minutes</p>
      <details class="mb-2">
        <summary class="mb-1">Ingredients</summary>
        <ul class="mb-0">
          <li v-for="(ing, i) in recipe.ingredients" :key="i">{{ ing }}</li>
        </ul>
      </details>
      <details class="mb-3">
        <summary class="mb-1">Instructions</summary>
        <p class="mb-0">{{ recipe.instructions }}</p>
      </details>

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
import Reviews from './ReviewsPage.vue'
defineProps({ recipe: { type: Object, required: true } })
</script>
