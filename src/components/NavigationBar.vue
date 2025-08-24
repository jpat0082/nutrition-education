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
          <template v-if="!user">
            <li class="nav-item"><RouterLink class="nav-link" to="/login">Login</RouterLink></li>
            <li class="nav-item">
              <RouterLink class="nav-link" to="/register">Register</RouterLink>
            </li>
          </template>

          <template v-else>
            <li class="nav-item dropdown me-2">
              <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                {{ user.name }}
                <span class="badge bg-secondary text-uppercase ms-1">{{ user.role }}</span>
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><RouterLink class="dropdown-item" to="/profile">Profile</RouterLink></li>
                <li><button class="dropdown-item" @click="onLogout">Logout</button></li>
              </ul>
            </li>

            <li class="nav-item">
              <button class="btn btn-outline-danger btn-sm" @click="onLogout">Logout</button>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { auth } from '../store/auth.js'

const router = useRouter()
const user = computed(() => auth.state.user)
function onLogout() {
  auth.logout()
  router.push({ name: 'home' })
}
onMounted(() => auth.seedAdmin())
</script>
