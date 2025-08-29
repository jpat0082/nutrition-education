<template>
  <div class="card">
    <div class="card-body">
      <h2 class="h5 mb-3">Profile</h2>

      <div class="row g-4">
        <div class="col-12 col-lg-6">
          <form @submit.prevent="saveProfile">
            <h3 class="h6">Update Details</h3>
            <div class="mb-2">
              <label class="form-label">Name</label>
              <input class="form-control" v-model.trim="name" required minlength="2" />
            </div>
            <div class="mb-2">
              <label class="form-label">Email (read-only)</label>
              <input class="form-control" :value="user?.email" disabled />
            </div>

            <div class="form-check mb-3">
              <input
                class="form-check-input"
                type="checkbox"
                :id="`2fa-${user?.email}`"
                v-model="twoFA"
              />
              <label class="form-check-label" :for="`2fa-${user?.email}`"
                >Enable Two-Factor Authentication (2FA)</label
              >
            </div>

            <button class="btn btn-primary btn-sm" :disabled="savingProfile">Save</button>
            <span class="text-success ms-2" v-if="savedOk">Saved!</span>
            <p class="text-danger mb-0" v-if="err1">{{ err1 }}</p>
          </form>
        </div>

        <div class="col-12 col-lg-6">
          <form @submit.prevent="changePwd">
            <h3 class="h6">Change Password</h3>
            <div class="mb-2">
              <label class="form-label">Old password</label>
              <div class="input-group">
                <input
                  :type="showOld ? 'text' : 'password'"
                  class="form-control"
                  v-model="oldPwd"
                  required
                  minlength="8"
                />
                <button class="btn btn-outline-secondary" type="button" @click="showOld = !showOld">
                  {{ showOld ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>
            <div class="mb-2">
              <label class="form-label">New password</label>
              <div class="input-group">
                <input
                  :type="showNew ? 'text' : 'password'"
                  class="form-control"
                  v-model="newPwd"
                  required
                  minlength="8"
                />
                <button class="btn btn-outline-secondary" type="button" @click="showNew = !showNew">
                  {{ showNew ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>
            <button class="btn btn-outline-secondary btn-sm" :disabled="changingPwd">
              Update Password
            </button>
            <span class="text-success ms-2" v-if="pwdOk">Updated!</span>
            <p class="text-danger mb-0" v-if="err2">{{ err2 }}</p>
          </form>
        </div>

        <div class="col-12">
          <h3 class="h6">Badges</h3>
          <div class="d-flex flex-wrap gap-2">
            <span v-for="b in badges" :key="b" class="badge text-bg-warning">{{ b }}</span>
            <span v-if="!badges.length" class="text-muted"
              >No badges yet. Rate and explore recipes!</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { auth } from '../store/auth.js'

const user = computed(() => auth.state.user)
const name = ref('')
const twoFA = ref(false)

watchEffect(() => {
  const u = auth.state.users.find((x) => x.email === user.value?.email)
  name.value = user.value?.name || ''
  twoFA.value = !!u?.twoFactorEnabled
})

const err1 = ref('')
const savedOk = ref(false)
const savingProfile = ref(false)
async function saveProfile() {
  err1.value = ''
  savedOk.value = false
  try {
    savingProfile.value = true
    auth.updateProfile({ email: user.value.email, name: name.value })
    auth.toggle2FA(user.value.email, twoFA.value)
    savedOk.value = true
  } catch (e) {
    err1.value = e.message || 'Could not save profile'
  } finally {
    savingProfile.value = false
  }
}

const oldPwd = ref('')
const newPwd = ref('')
const err2 = ref('')
const pwdOk = ref(false)
const changingPwd = ref(false)
const showOld = ref(false)
const showNew = ref(false)
async function changePwd() {
  err2.value = ''
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
    err2.value = e.message || 'Could not change password'
  } finally {
    changingPwd.value = false
  }
}

import { loadBadges } from '../utils/user-badges.js'
const badges = computed(() => loadBadges(user.value?.email))
</script>
