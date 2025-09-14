<template>
  <div class="access-tools">
    <button class="btn btn-sm btn-outline-dark" @click="bump(1)" title="Increase font">A+</button>
    <button class="btn btn-sm btn-outline-dark" @click="bump(-1)" title="Decrease font">A−</button>
    <button class="btn btn-sm btn-outline-dark" @click="toggleContrast" title="High contrast">
      HC
    </button>
    <button class="btn btn-sm btn-outline-dark" @click="toggleDyslexic" title="Dyslexic-friendly">
      DF
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
const size = ref(Number(localStorage.getItem('ne_a11y_fs') || 100))
const contrast = ref(localStorage.getItem('ne_a11y_hc') === '1')
const dys = ref(localStorage.getItem('ne_a11y_df') === '1')

function apply() {
  document.documentElement.style.fontSize = Math.max(80, Math.min(150, size.value)) + '%'
  document.documentElement.classList.toggle('hc', contrast.value)
  document.documentElement.classList.toggle('dys', dys.value)
}
function bump(n) {
  size.value = size.value + n * 10
  localStorage.setItem('ne_a11y_fs', String(size.value))
  apply()
}
function toggleContrast() {
  contrast.value = !contrast.value
  localStorage.setItem('ne_a11y_hc', contrast.value ? '1' : '0')
  apply()
}
function toggleDyslexic() {
  dys.value = !dys.value
  localStorage.setItem('ne_a11y_df', dys.value ? '1' : '0')
  apply()
}
onMounted(apply)
</script>

<style scoped>
.access-tools {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 9999;
  display: flex;
  gap: 6px;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  padding: 6px;
  border-radius: 10px;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
}
</style>

<!-- Global helper styles (add to your main.css or index.css) -->
<style>
html.hc {
  filter: contrast(1.15) saturate(1.05);
}
html.dys {
  font-family:
    OpenDyslexic,
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
}
</style>
