<template>
  <nav class="navbar navbar-expand-lg bg-light border-bottom">
    <div class="container">
      <RouterLink class="navbar-brand fw-bold" to="/">Nutrition Education</RouterLink>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div id="nav" class="collapse navbar-collapse">
        <ul class="navbar-nav me-auto">
          <li class="nav-item"><RouterLink class="nav-link" to="/">Home</RouterLink></li>
          <li class="nav-item"><RouterLink class="nav-link" to="/recipes">Recipes</RouterLink></li>
          <li class="nav-item" v-if="user?.role === 'admin'">
            <RouterLink class="nav-link" to="/admin">Admin</RouterLink>
          </li>
        </ul>

        <ul class="navbar-nav ms-auto">
          <li class="nav-item" v-if="!user">
            <RouterLink class="nav-link" to="/login">Login</RouterLink>
          </li>
          <li class="nav-item" v-if="!user">
            <RouterLink class="nav-link" to="/register">Register</RouterLink>
          </li>
          <li class="nav-item dropdown" v-if="user">
            <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
              {{ user.name }} <span class="badge bg-secondary text-uppercase">{{ user.role }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><RouterLink class="dropdown-item" to="/profile">Profile</RouterLink></li>
              <li><a class="dropdown-item" href="#" @click.prevent="onLogout">Logout</a></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { auth } from '../store/auth.js'
import { useRouter, RouterLink } from 'vue-router'

const router = useRouter()
const user = computed(() => auth.state.user)
function onLogout() {
  auth.logout()
  router.push({ name: 'home' })
}
onMounted(() => {
  auth.seedAdmin()
})
</script>
