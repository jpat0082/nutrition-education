<template>
  <div class="row justify-content-center">
    <div class="col-12 col-lg-8">
      <div class="card">
        <div class="card-body">
          <h2 class="h5 mb-3">Profile</h2>

          <div v-if="!user" class="text-muted">You are not logged in.</div>

          <div v-else class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label">Email</label>
              <input class="form-control" :value="user.email" disabled />
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Display name</label>
              <input v-model.trim="name" class="form-control" />
            </div>

            <div class="col-12" v-if="can2FA">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="twofa" v-model="twoFA" />
                <label class="form-check-label" for="twofa"
                  >Enable Two-Factor Authentication (2FA)</label
                >
              </div>
            </div>

            <div class="col-12">
              <button class="btn btn-primary" :disabled="saving" @click="saveProfile">
                {{ saving ? 'Saving…' : 'Save profile' }}
              </button>
              <span class="ms-2 small text-success" v-if="saved">Saved</span>
              <div class="text-danger mt-2" v-if="err">{{ err }}</div>
            </div>

            <div class="col-12">
              <h3 class="h6">Security</h3>
              <div class="d-flex flex-wrap gap-2">
                <button
                  class="btn btn-outline-secondary"
                  @click="sendVerify"
                  :disabled="verifying || !hasVerify"
                >
                  {{ verifying ? 'Sending…' : 'Send email verification' }}
                </button>
                <button class="btn btn-outline-danger" @click="logout">Log out</button>
              </div>
              <div class="form-text mt-2" v-if="info">{{ info }}</div>
            </div>

            <div class="col-12" v-if="canChangePwd">
              <h3 class="h6">Change Password</h3>
              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <label class="form-label">Old password</label>
                  <div class="input-group">
                    <input
                      :type="showOld ? 'text' : 'password'"
                      class="form-control"
                      v-model="oldPwd"
                      minlength="8"
                    />
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="showOld = !showOld"
                    >
                      {{ showOld ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label">New password</label>
                  <div class="input-group">
                    <input
                      :type="showNew ? 'text' : 'password'"
                      class="form-control"
                      v-model="newPwd"
                      minlength="8"
                    />
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="showNew = !showNew"
                    >
                      {{ showNew ? 'Hide' : 'Show' }}
                    </button>
                  </div>
                </div>
                <div class="col-12">
                  <button
                    class="btn btn-outline-secondary"
                    :disabled="changingPwd"
                    @click="changePwd"
                  >
                    {{ changingPwd ? 'Updating…' : 'Update Password' }}
                  </button>
                  <span class="ms-2 small text-success" v-if="pwdOk">Updated</span>
                  <div class="text-danger mt-2" v-if="errPwd">{{ errPwd }}</div>
                </div>
              </div>
            </div>

            <div class="col-12" v-if="badges.length">
              <h3 class="h6">Badges</h3>
              <div class="d-flex flex-wrap gap-2">
                <span v-for="b in badges" :key="b" class="badge text-bg-warning">{{ b }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { auth } from '@/store/auth.js'

const user = computed(() => auth.currentUser?.() || auth.state?.user || null)

const name = ref('')
const saving = ref(false)
const saved = ref(false)
const err = ref('')
const info = ref('')

const hasVerify = typeof auth.resendVerification === 'function'
const can2FA = typeof auth.toggle2FA === 'function'
const canChangePwd =
  import.meta.env.VITE_USE_FIREBASE !== '1' && typeof auth.changePassword === 'function'

const twoFA = ref(false)

watch(
  user,
  (u) => {
    if (u) {
      name.value = u.name || u.email?.split('@')[0] || ''
      if (can2FA) {
        const list = auth.state?.users || []
        const rec = Array.isArray(list) ? list.find((x) => x.email === u.email) : null
        twoFA.value = !!rec?.twoFactorEnabled
      }
    }
  },
  { immediate: true },
)

async function saveProfile() {
  if (!user.value) return
  try {
    saving.value = true
    saved.value = false
    err.value = ''
    await auth.updateProfile({ email: user.value.email, name: name.value })
    if (can2FA) auth.toggle2FA(user.value.email, twoFA.value)
    saved.value = true
  } catch (e) {
    err.value = e?.message || 'Save failed'
  } finally {
    saving.value = false
    setTimeout(() => (saved.value = false), 1500)
  }
}

const verifying = ref(false)
async function sendVerify() {
  if (!user.value || !hasVerify) return
  try {
    verifying.value = true
    err.value = ''
    info.value = ''
    const r = await auth.resendVerification(user.value.email)
    if (r?.alreadyVerified) info.value = 'Email already verified.'
    else info.value = 'Verification email sent.'
  } catch (e) {
    err.value = e?.message || 'Failed to send verification'
  } finally {
    verifying.value = false
  }
}

async function logout() {
  try {
    await auth.logout()
  } catch {
    //ignore
  }
}

const oldPwd = ref('')
const newPwd = ref('')
const showOld = ref(false)
const showNew = ref(false)
const changingPwd = ref(false)
const pwdOk = ref(false)
const errPwd = ref('')
async function changePwd() {
  if (!canChangePwd || !user.value) return
  errPwd.value = ''
  pwdOk.value = false
  try {
    changingPwd.value = true
    await auth.changePassword({
      email: user.value.email,
      oldPassword: oldPwd.value,
      newPassword: newPwd.value,
    })
    pwdOk.value = true
    oldPwd.value = ''
    newPwd.value = ''
  } catch (e) {
    errPwd.value = e?.message || 'Could not change password'
  } finally {
    changingPwd.value = false
  }
}

const badges = ref([])
let loadBadgesFn = null
onMounted(async () => {
  try {
    const m = await import('@/utils/user-badges.js')
    loadBadgesFn = m.loadBadges || null
    if (loadBadgesFn && user.value?.email) badges.value = loadBadgesFn(user.value.email) || []
  } catch {
    //ignore
  }
})
watch(user, (u) => {
  if (loadBadgesFn && u?.email) badges.value = loadBadgesFn(u.email) || []
})
</script>

<style scoped>
.card {
  background: var(--bs-body-bg);
}
</style>
