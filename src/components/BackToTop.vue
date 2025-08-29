<template>
  <button
    v-show="visible"
    class="btn btn-primary back-to-top"
    type="button"
    aria-label="Back to top"
    @click="toTop"
  >
    ↑
  </button>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const visible = ref(false)
function onScroll() {
  visible.value = window.scrollY > 300
}
function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
.back-to-top {
  position: fixed;
  right: 16px;
  bottom: 24px;
  z-index: 1080;
  border-radius: 999px;
  padding: 0.5rem 0.7rem;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
}
</style>
