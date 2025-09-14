<template>
  <div class="row justify-content-center">
    <div class="col-12 col-md-10 col-lg-8">
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h4 mb-3">Create your account</h2>
          <form @submit.prevent="submit" novalidate>
            <div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label">Full name</label>
                <input
                  v-model.trim="name"
                  class="form-control"
                  :class="{ 'is-invalid': name && !patterns.name.test(name) }"
                  placeholder="e.g., Ayesha Malik"
                  required
                  minlength="2"
                />
                <div class="invalid-feedback">2–49 letters, spaces and . ’ - allowed.</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Email</label>
                <input
                  v-model.trim="email"
                  class="form-control"
                  :class="{
                    'is-invalid':
                      email && (emailTaken || !patterns.email.test(email) || disposable),
                  }"
                  type="email"
                  required
                  autocomplete="username"
                />
                <div class="invalid-feedback" v-if="emailTaken">
                  This email is already registered.
                </div>
                <div class="invalid-feedback" v-else-if="disposable">
                  Please use a real email (disposable domains are blocked).
                </div>
                <div class="invalid-feedback" v-else>Enter a valid email.</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Password</label>
                <div class="input-group">
                  <input
                    :type="showPwd ? 'text' : 'password'"
                    v-model="password"
                    class="form-control"
                    :class="{ 'is-invalid': password && !patterns.passwordStrong.test(password) }"
                    required
                    minlength="8"
                    autocomplete="new-password"
                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="showPwd = !showPwd"
                  >
                    {{ showPwd ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <div class="invalid-feedback">Use 8+ chars with upper, lower and a number.</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Confirm password</label>
                <div class="input-group">
                  <input
                    :type="showConfirm ? 'text' : 'password'"
                    v-model="confirm"
                    class="form-control"
                    :class="{ 'is-invalid': confirm && confirm !== password }"
                    required
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="showConfirm = !showConfirm"
                  >
                    {{ showConfirm ? 'Hide' : 'Show' }}
                  </button>
                </div>
                <div class="invalid-feedback">Passwords must match.</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Phone (optional)</label>
                <input
                  v-model.trim="phone"
                  class="form-control"
                  :class="{ 'is-invalid': phone && !patterns.phone10.test(phone) }"
                  placeholder="10 digits"
                  inputmode="numeric"
                />
                <div class="invalid-feedback">Enter exactly 10 digits or leave blank.</div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label">Role</label>
                <select v-model="role" class="form-select" required>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div class="col-12">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="terms" v-model="terms" />
                  <label class="form-check-label" for="terms">
                    I agree to the community guidelines (no spam, be respectful).
                  </label>
                </div>
                <div class="text-danger small" v-if="submitted && !terms">
                  Please accept the terms to continue.
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-success" :disabled="loading">Create Account</button>
              <RouterLink class="btn btn-outline-secondary" to="/login">Back to Login</RouterLink>
            </div>

            <p class="text-danger mt-3 mb-0" v-if="err" aria-live="polite" role="status">
              {{ err }}
            </p>
            <p class="text-success mt-3 mb-0" v-if="ok" aria-live="polite" role="status">
              Registered! Redirecting to login…
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { patterns, focusFirstInvalid, isDisposableDomain, normEmail } from '../utils/validation.js'
import { upsertUser, findByEmail } from '@/store/userRegistry'

const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const phone = ref('')
const role = ref('user')
const terms = ref(false)

const submitted = ref(false)
const loading = ref(false)
const err = ref('')
const ok = ref(false)

const showPwd = ref(false)
const showConfirm = ref(false)

const emailTaken = computed(() => !!findByEmail(normEmail(email.value)))
const disposable = computed(() => isDisposableDomain(email.value))

async function submit() {
  submitted.value = true
  err.value = ''
  ok.value = false

  const phoneOk = !phone.value || patterns.phone10.test(phone.value)
  const valid =
    patterns.name.test(name.value) &&
    patterns.email.test(email.value) &&
    !emailTaken.value &&
    !disposable.value &&
    patterns.passwordStrong.test(password.value) &&
    confirm.value === password.value &&
    phoneOk &&
    terms.value

  if (!valid) {
    err.value = 'Please fix the highlighted fields.'
    focusFirstInvalid(document.querySelector('form'))
    return
  }

  try {
    loading.value = true

    upsertUser({
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value,
      disabled: false,
      phone: phone.value || undefined,
    })

    localStorage.setItem('ph_last_email', email.value)
    localStorage.setItem('ph_last_user', name.value || email.value.split('@')[0])

    ok.value = true

    setTimeout(() => {
      router.push({ name: 'login' })
    }, 600)
  } catch (e) {
    err.value = e?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
