<template>
  <div class="row justify-content-center">
    <div class="col-12 col-md-8 col-lg-6">
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">Login</h2>

          <form @submit.prevent="submit" novalidate>
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input
                v-model.trim="email"
                class="form-control"
                :class="{ 'is-invalid': email && !patterns.email.test(email) }"
                type="email"
                required
                autocomplete="username"
                list="known-emails"
              />
              <div class="invalid-feedback">Enter a valid email address.</div>

              <datalist id="known-emails">
                <option v-for="u in userEmails" :key="u" :value="u" />
              </datalist>
              <div v-if="autoFilled" class="form-text">Suggested from this device.</div>
            </div>

            <div class="mb-3">
              <label class="form-label">Password</label>
              <div class="input-group">
                <input
                  :type="showPwd ? 'text' : 'password'"
                  v-model="password"
                  class="form-control"
                  :class="{ 'is-invalid': password && password.length < 8 }"
                  required
                  minlength="8"
                  autocomplete="current-password"
                />
                <button class="btn btn-outline-secondary" type="button" @click="showPwd = !showPwd">
                  {{ showPwd ? 'Hide' : 'Show' }}
                </button>
              </div>
              <div class="invalid-feedback">Minimum 8 characters required.</div>
            </div>

            <div class="form-check mb-2">
              <input
                class="form-check-input"
                type="checkbox"
                id="rememberSession"
                v-model="rememberSession"
              />
              <label class="form-check-label" for="rememberSession">
                Keep me logged in (remember session)
              </label>
            </div>

            <div class="form-check mb-3">
              <input
                class="form-check-input"
                type="checkbox"
                id="rememberCred"
                v-model="rememberCred"
              />
              <label class="form-check-label" for="rememberCred">
                Remember my email & password on this device (demo)
              </label>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-primary" :disabled="loading">Login</button>
              <RouterLink class="btn btn-outline-secondary" to="/register"
                >Create account</RouterLink
              >
            </div>

            <div class="text-center my-3">
              <span class="text-muted">or</span>
            </div>

            <GoogleLoginButton />

            <p class="text-danger mt-3" v-if="err" aria-live="polite" role="status">{{ err }}</p>

            <div v-if="needVerify" class="mt-2">
              <RouterLink :to="{ name: 'verify', query: { email: email } }"
                >Verify your email</RouterLink
              >
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { auth } from '../store/auth.js'
import { patterns, focusFirstInvalid } from '../utils/validation.js'
import { saveCredentials, loadCredentials } from '../utils/credentials.js'
import GoogleLoginButton from '@/components/GoogleLoginButton.vue'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const showPwd = ref(false)

const rememberSession = ref(true)
const rememberCred = ref(false)
const loading = ref(false)
const err = ref('')
const needVerify = ref(false)

const autoFilled = ref(false)

const userEmails = computed(() => (auth.users || []).map((u) => u.email).sort())

onMounted(() => {
  const c = loadCredentials()
  if (c?.email) {
    email.value = c.email
    if (c.password) password.value = c.password
    autoFilled.value = true
  }
})

async function submit() {
  err.value = ''
  needVerify.value = false

  if (!patterns.email.test(email.value) || password.value.length < 8) {
    err.value = 'Please fix the highlighted fields.'
    focusFirstInvalid(document.querySelector('form'))
    return
  }

  try {
    loading.value = true
    await auth.login({
      email: email.value,
      password: password.value,
      remember: rememberSession.value,
    })

    if (rememberCred.value) {
      saveCredentials({ email: email.value, password: password.value })
    }

    const dest =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : { name: 'recipes' }

    router.push(dest)
  } catch (e) {
    const msg = e?.message || ''
    if (e?.code === '2FA_REQUIRED' || msg === '2FA_REQUIRED') {
      router.push({
        name: 'twofa',
        query: { email: email.value, redirect: route.query.redirect || '' },
      })
      return
    }
    err.value = msg || 'Login failed'
    if (/verify/i.test(err.value)) needVerify.value = true
  } finally {
    loading.value = false
  }
}
</script>
