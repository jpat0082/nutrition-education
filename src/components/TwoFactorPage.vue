<template>
  <div class="row justify-content-center">
    <div class="col-12 col-md-8 col-lg-6">
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">Two-Factor Authentication</h2>
          <p class="text-muted">
            Enter the 6-digit code sent to <strong>{{ email }}</strong
            >.
            <br />
            <span class="small">Demo note: code is shown below for testing.</span>
          </p>

          <div v-if="demoCode" class="alert alert-info py-2">
            <strong>Demo code:</strong> {{ demoCode }}
          </div>

          <form @submit.prevent="submit" novalidate>
            <label class="form-label">Authentication code</label>
            <input
              v-model.trim="code"
              class="form-control"
              inputmode="numeric"
              maxlength="6"
              placeholder="Enter 6-digit code"
              required
            />
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-primary">Verify &amp; Continue</button>
              <button class="btn btn-outline-secondary" type="button" @click="resend">
                Resend code
              </button>
            </div>
            <p class="text-danger mt-3 mb-0" v-if="err">{{ err }}</p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth } from '../store/auth.js'

const route = useRoute()
const router = useRouter()

const email = computed(() => String(route.query.email || ''))
const code = ref('')
const err = ref('')

const demoCode = computed(() => auth.state.pending2FA?.otp || '')

function submit() {
  err.value = ''
  try {
    auth.complete2FA({ email: email.value, code: code.value })
    const dest =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : { name: 'recipes' }
    router.push(dest)
  } catch (e) {
    err.value = e?.message || 'Invalid code'
  }
}

function resend() {
  err.value = ''
  try {
    // Just call it; demoCode is reactive and will update from the store.
    auth.resend2FA(email.value)
  } catch (e) {
    err.value = e?.message || 'Could not resend'
  }
}
</script>
