<template>
  <nav
    :class="[
      'navbar navbar-expand-lg bg-body border-bottom sticky-top',
      { 'navbar-shadow': hasShadow },
    ]"
  >
    <div class="container">
      <RouterLink class="navbar-brand fw-bold" to="/">Nutrition Education</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#nav"
        aria-controls="nav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="nav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/">Home</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/recipes">Recipes</RouterLink></li>

          <!-- NEW main-site links -->
          <li class="nav-item"><RouterLink class="nav-link" to="/tools">Tools</RouterLink></li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/planner">Meal Planner</RouterLink>
          </li>
          <li class="nav-item"><RouterLink class="nav-link" to="/quiz">Quiz</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/about">About</RouterLink></li>

          <!-- Admin only -->
          <li class="nav-item" v-if="user?.role === 'admin'">
            <RouterLink class="nav-link" to="/admin">Admin</RouterLink>
          </li>
        </ul>

        <div class="d-flex align-items-center gap-2 ms-auto">
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="onToggleTheme"
            :title="`Theme: ${theme}`"
            type="button"
          >
            {{ theme === 'dark' ? '🌙' : '☀️' }}
          </button>

          <template v-if="!user">
            <RouterLink class="btn btn-sm btn-outline-secondary" to="/login">Login</RouterLink>
            <RouterLink class="btn btn-sm btn-primary" to="/register">Register</RouterLink>
          </template>

          <template v-else>
            <div class="dropdown">
              <button
                class="btn btn-sm btn-outline-secondary dropdown-toggle"
                data-bs-toggle="dropdown"
                type="button"
              >
                {{ user.name }}
                <span class="badge bg-secondary text-uppercase ms-1">{{ user.role }}</span>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><RouterLink class="dropdown-item" to="/profile">Profile</RouterLink></li>
                <li>
                  <button class="dropdown-item" @click="onLogout" type="button">Logout</button>
                </li>
              </ul>
            </div>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { auth } from '../store/auth.js'
import { getTheme, toggleTheme } from '../utils/theme.js'

const router = useRouter()
const user = computed(() => auth.state.user)

function onLogout() {
  auth.logout()
  router.push({ name: 'home' })
}

const theme = ref(getTheme())
function onToggleTheme() {
  theme.value = toggleTheme()
}

const hasShadow = ref(false)
function onScroll() {
  hasShadow.value = window.scrollY > 8
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.navbar-shadow {
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.05);
}
</style>
