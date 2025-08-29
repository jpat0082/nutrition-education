<template>
  <div class="row justify-content-center">
    <div class="col-12 col-md-8 col-lg-6">
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">Verify your email</h2>
          <p class="text-muted">
            We sent a six-digit code to <strong>{{ emailMask }}</strong
            >.
            <br />
            <span class="small">Demo note: the code is shown below to simulate an email.</span>
          </p>

          <div v-if="demoCode" class="alert alert-info py-2">
            <strong>Demo code:</strong> {{ demoCode }}
            <button class="btn btn-sm btn-outline-secondary ms-2" @click="copyCode">Copy</button>
          </div>

          <form @submit.prevent="submit" class="mt-2" novalidate>
            <label class="form-label">Verification code</label>
            <input
              v-model.trim="code"
              class="form-control"
              inputmode="numeric"
              maxlength="6"
              placeholder="Enter 6-digit code"
              required
            />
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-primary">Verify</button>
              <button type="button" class="btn btn-outline-secondary" @click="resend">
                Resend code
              </button>
              <RouterLink class="btn btn-outline-dark" to="/login">Back to Login</RouterLink>
            </div>
            <p class="text-danger mt-3 mb-0" v-if="err" aria-live="polite" role="status">
              {{ err }}
            </p>
            <p class="text-success mt-3 mb-0" v-if="ok">Email verified! You can now log in.</p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { auth } from '../store/auth.js'
import { normEmail } from '../utils/validation.js'

const route = useRoute()
const email = ref(normEmail(route.query.email || ''))
const demoCode = ref(String(route.query.code || ''))
const code = ref('')
const err = ref('')
const ok = ref(false)

const emailMask = computed(() => {
  const e = email.value
  const [u, d] = e.split('@')
  if (!u || !d) return e
  const maskU =
    u.length <= 2 ? u[0] + '*' : u[0] + '*'.repeat(Math.max(1, u.length - 2)) + u[u.length - 1]
  return `${maskU}@${d}`
})

async function submit() {
  err.value = ''
  ok.value = false
  if (!email.value || !code.value) {
    err.value = 'Enter your code.'
    return
  }
  try {
    const res = auth.verifyEmail({ email: email.value, code: code.value })
    if (res.ok || res.alreadyVerified) ok.value = true
  } catch (e) {
    err.value = e.message || 'Verification failed'
  }
}

async function resend() {
  err.value = ''
  ok.value = false
  try {
    const { code } = await auth.resendVerification(email.value)
    demoCode.value = code
  } catch (e) {
    err.value = e.message || 'Could not resend code'
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(demoCode.value)
  } catch {
    // ignore clipboard errors
  }
}
</script>
