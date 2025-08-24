<template>
  <div class="row justify-content-center">
    <div class="col-12 col-md-8 col-lg-6">
      <div class="card">
        <div class="card-body">
          <h2 class="h4 mb-3">Login</h2>
          <form @submit.prevent="submit">
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input
                v-model.trim="email"
                class="form-control"
                type="email"
                required
                pattern="^[\\w-.]+@([\\w-]+\\.)+[\\w-]{2,}$"
              />
              <div class="form-text">Use a valid email (validation: required + pattern)</div>
            </div>
            <div class="mb-3">
              <label class="form-label">Password</label>
              <input
                v-model="password"
                class="form-control"
                type="password"
                required
                minlength="8"
              />
              <div class="form-text">Minimum 8 characters (validation: required + min length)</div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-primary" :disabled="loading">Login</button>
              <RouterLink class="btn btn-outline-secondary" to="/register"
                >Create account</RouterLink
              >
            </div>
            <p class="text-danger mt-3" v-if="err">{{ err }}</p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../store/auth.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  try {
    loading.value = true
    await auth.login({ email: email.value, password: password.value })
    router.push({ name: 'home' })
  } catch (e) {
    err.value = e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
