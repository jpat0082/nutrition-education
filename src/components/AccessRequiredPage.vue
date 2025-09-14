<template>
  <div class="row justify-content-center">
    <div class="col-12 col-md-10 col-lg-8">
      <div class="card shadow-sm">
        <div class="card-body">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="lock">🔒</span>
            <h1 class="h4 mb-0">Access required</h1>
          </div>

          <p class="text-muted">
            You need to be logged in to view
            <strong>{{ prettyTarget }}</strong
            >.
          </p>

          <div class="d-flex flex-wrap gap-2">
            <RouterLink
              class="btn btn-primary"
              :to="{ name: 'login', query: { redirect: target } }"
            >
              Go to Login
            </RouterLink>

            <RouterLink class="btn btn-outline-secondary" :to="{ name: 'home' }">
              Back to Home
            </RouterLink>
          </div>

          <p class="small text-muted mt-3 mb-0">
            Don’t have an account?
            <RouterLink :to="{ name: 'register', query: { redirect: target } }">
              Create one now </RouterLink
            >.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

const route = useRoute()
const target = computed(() => String(route.query.redirect || '/'))

const prettyTarget = computed(() => {
  const p = target.value
  if (p.startsWith('/tools')) return 'Tools'
  if (p.startsWith('/planner')) return 'Meal Planner'
  if (p.startsWith('/quiz')) return 'Quiz'
  if (p.startsWith('/about')) return 'About'
  return 'this page'
})
</script>

<style scoped>
.lock {
  font-size: 1.25rem;
}
</style>
