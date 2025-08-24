<template>
  <div class="min-vh-100 d-flex flex-column">
    <Navbar />
    <main class="container py-4 flex-grow-1">
      <router-view />
    </main>
    <footer class="text-center py-3 border-top small">
      © {{ new Date().getFullYear() }} Nutrition Education · Built with Vue 3
    </footer>
  </div>
</template>

<script setup>
import Navbar from './components/NavigationBar.vue'
</script>

<style scoped>
footer {
  background: #fafafa;
}
</style>
