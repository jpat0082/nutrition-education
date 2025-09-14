<template>
  <div class="row g-3">
    <section class="col-12">
      <div class="p-3 p-md-4 border rounded-3 bg-body">
        <h1 class="h4 mb-2">About & Contact</h1>
        <p class="text-muted mb-0">
          Our mission is to make nutrition education practical and accessible.
        </p>
      </div>
    </section>

    <section class="col-12 col-lg-6">
      <div class="card h-100">
        <div class="card-body">
          <h2 class="h6">Contact us</h2>
          <form class="row g-2" @submit.prevent="send" novalidate>
            <div class="col-12">
              <label class="form-label small text-muted">Your email</label>
              <input
                v-model.trim="email"
                class="form-control"
                type="email"
                required
                :class="{ 'is-invalid': tried && !validEmail }"
              />
              <div class="invalid-feedback">Enter a valid email.</div>
            </div>
            <div class="col-12">
              <label class="form-label small text-muted">Message</label>
              <textarea
                v-model.trim="msg"
                class="form-control"
                rows="4"
                required
                :class="{ 'is-invalid': tried && msg.length < 10 }"
              ></textarea>
              <div class="invalid-feedback">Min 10 characters.</div>
            </div>
            <div class="col-12 d-flex gap-2">
              <button class="btn btn-primary">Send</button>
              <span v-if="ok" class="text-success small">Thanks! (saved locally)</span>
            </div>
          </form>
          <p class="small text-muted mt-2 mb-0">Demo: messages are stored on this device only.</p>
        </div>
      </div>
    </section>

    <section class="col-12 col-lg-6">
      <div class="card h-100">
        <div class="card-body">
          <h2 class="h6">Our values</h2>
          <ul class="small">
            <li>Evidence-based nutrition education</li>
            <li>Accessibility (WCAG patterns, semantics)</li>
            <li>Privacy-first: your tools data stays local</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
const email = ref('')
const msg = ref('')
const ok = ref(false)
const tried = ref(false)
const validEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
function send() {
  tried.value = true
  if (!validEmail.value || msg.value.length < 10) return
  const box = JSON.parse(localStorage.getItem('ne_contact') || '[]')
  box.push({ email: email.value, msg: msg.value, ts: Date.now() })
  localStorage.setItem('ne_contact', JSON.stringify(box))
  ok.value = true
  msg.value = ''
}
</script>

<style scoped>
.card {
  background: var(--bs-body-bg);
}
</style>
