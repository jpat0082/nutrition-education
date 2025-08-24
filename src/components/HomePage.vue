<template>
  <section class="row g-4 align-items-stretch">
    <div class="col-12 col-lg-7">
      <div class="p-4 border rounded-3 h-100">
        <h1 class="h3">Public Health through Nutrition Education</h1>
        <p class="mb-2">
          Learn evidence-based nutrition, explore low-cost healthy recipes, and share community
          reviews.
        </p>
        <ul class="mb-0">
          <li>Responsive design (Bootstrap) for all devices.</li>
          <li>Two+ input validations on forms (required, pattern, length, ranges).</li>
          <li>Dynamic data from local JSON/state.</li>
          <li>Role-based access (user/admin) and login/register.</li>
          <li>Aggregated ratings with safety against XSS.</li>
        </ul>
      </div>
    </div>
    <div class="col-12 col-lg-5">
      <div class="p-4 border rounded-3 h-100">
        <h2 class="h5">Quick Tips</h2>
        <ul class="mb-0">
          <li v-for="t in tips" :key="t.id">{{ t.text }}</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import tips from '../data/tips.json'
</script>
