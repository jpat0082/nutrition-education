<template>
  <div class="card">
    <div class="card-body">
      <h2 class="h5 mb-3">Profile</h2>

      <div class="row g-3">
        <div class="col-12 col-md-6">
          <form @submit.prevent="saveProfile">
            <h3 class="h6">Update Details</h3>
            <div class="mb-2">
              <label class="form-label">Name</label>
              <input class="form-control" v-model.trim="name" required minlength="2" />
            </div>
            <div class="mb-2">
              <label class="form-label">Email (read‑only)</label>
              <input class="form-control" :value="user?.email" disabled />
            </div>
            <button class="btn btn-primary btn-sm" :disabled="savingProfile">Save</button>
            <span class="text-success ms-2" v-if="savedOk">Saved!</span>
            <p class="text-danger mb-0" v-if="err1">{{ err1 }}</p>
          </form>
        </div>

        <div class="col-12 col-md-6">
          <form @submit.prevent="changePwd">
            <h3 class="h6">Change Password</h3>
            <div class="mb-2">
              <label class="form-label">Old password</label>
              <input class="form-control" type="password" v-model="oldPwd" required minlength="8" />
            </div>
            <div class="mb-2">
              <label class="form-label">New password</label>
              <input class="form-control" type="password" v-model="newPwd" required minlength="8" />
            </div>
            <button class="btn btn-outline-secondary btn-sm" :disabled="changingPwd">
              Update Password
            </button>
            <span class="text-success ms-2" v-if="pwdOk">Updated!</span>
            <p class="text-danger mb-0" v-if="err2">{{ err2 }}</p>
          </form>
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
const err1 = ref('')
const savedOk = ref(false)
const savingProfile = ref(false)

watchEffect(() => {
  name.value = user.value?.name || ''
})

async function saveProfile() {
  err1.value = ''
  savedOk.value = false
  try {
    savingProfile.value = true
    auth.updateProfile({ email: user.value.email, name: name.value })
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
</script>
