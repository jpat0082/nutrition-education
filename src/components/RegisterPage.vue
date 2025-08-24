<template>
  <div class="row justify-content-center">
    <div class="col-12 col-md-8 col-lg-6">
      <div class="card">
        <div class="card-body">
          <h2 class="h4 mb-3">Register</h2>
          <form @submit.prevent="submit">
            <div class="mb-3">
              <label class="form-label">Full name</label>
              <input v-model.trim="name" class="form-control" type="text" required minlength="2" />
            </div>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input
                v-model.trim="email"
                class="form-control"
                type="email"
                required
                autocomplete="username"
                pattern="^[\\w-.]+@([\\w-]+\\.)+[\\w-]{2,}$"
              />
            </div>
            <div class="mb-3">
              <label class="form-label">Password</label>
              <input
                v-model="password"
                class="form-control"
                type="password"
                required
                minlength="8"
                autocomplete="new-password"
              />
              <div class="form-text">Use 8+ chars. Demo only — don’t reuse real passwords.</div>
            </div>
            <div class="mb-3">
              <label class="form-label">Role</label>
              <select v-model="role" class="form-select" required>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button class="btn btn-success" :disabled="loading">Create Account</button>
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
const name = ref('')
const email = ref('')
const password = ref('')
const role = ref('user')
const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  try {
    loading.value = true
    await auth.register({
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value,
    })
    await auth.login({ email: email.value, password: password.value, remember: true })
    router.push({ name: 'home' })
  } catch (e) {
    err.value = e.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
