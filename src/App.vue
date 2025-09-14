<template>
  <NavigationBar />
  <main class="py-3 py-md-4">
    <div class="container">
      <RouterView />
    </div>
  </main>
  <BackToTop />
  <AccessibilityWidget />
</template>

<script setup>
import AccessibilityWidget from './components/AccessibilityWidget.vue'
import NavigationBar from './components/NavigationBar.vue'
import BackToTop from './components/BackToTop.vue'
</script>
