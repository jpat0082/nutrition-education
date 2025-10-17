<template>
  <div class="row justify-content-center">
    <div class="col-12 col-lg-9">
      <div class="card shadow-sm">
        <div class="card-body">
          <h2 class="h5 mb-3">Profile</h2>

          <div v-if="!user" class="alert alert-warning mb-0">You are not logged in.</div>

          <form v-else class="row g-3" @submit.prevent="saveProfile">
            <div class="col-12 col-md-4">
              <label class="form-label">Full name</label>
              <input v-model.trim="name" class="form-control" required minlength="2" />
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label">Email</label>
              <input
                v-model.trim="emailEdit"
                class="form-control"
                :class="{ 'is-invalid': emailEdit && !patterns.email.test(emailEdit) }"
                type="email"
                required
              />
              <div class="invalid-feedback">Enter a valid email.</div>
            </div>

            <div class="col-12 col-md-4">
              <label class="form-label">Phone</label>
              <input
                v-model.trim="phone"
                class="form-control"
                inputmode="tel"
                :class="{ 'is-invalid': phone && !patterns.phone10.test(phone) }"
                placeholder="10 digits"
              />
              <div class="invalid-feedback">Enter exactly 10 digits or leave blank.</div>
            </div>

            <div class="col-12 d-flex flex-wrap gap-2">
              <button class="btn btn-primary" :disabled="saving">
                {{ saving ? 'Saving…' : 'Save profile' }}
              </button>
              <span class="small text-success align-self-center" v-if="saved">Saved</span>
              <span class="small text-danger align-self-center" v-if="err">{{ err }}</span>
            </div>

            <div class="col-12"><hr class="my-2" /></div>

            <div class="col-12">
              <h3 class="h6">Change password</h3>
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label">Current password</label>
              <div class="input-group">
                <input
                  :type="showOld ? 'text' : 'password'"
                  class="form-control"
                  v-model="oldPwd"
                  minlength="8"
                  autocomplete="current-password"
                />
                <button class="btn btn-outline-secondary" type="button" @click="showOld = !showOld">
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
                  autocomplete="new-password"
                />
                <button class="btn btn-outline-secondary" type="button" @click="showNew = !showNew">
                  {{ showNew ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <div class="col-12 d-flex gap-2">
              <button
                class="btn btn-outline-secondary"
                type="button"
                :disabled="changingPwd"
                @click="changePwd"
              >
                {{ changingPwd ? 'Updating…' : 'Update password' }}
              </button>
              <span class="small text-success align-self-center" v-if="pwdOk">Updated</span>
              <span class="small text-danger align-self-center" v-if="errPwd">{{ errPwd }}</span>
            </div>

            <div class="col-12"><hr class="my-2" /></div>

            <div class="col-12 d-flex flex-wrap gap-2">
              <button class="btn btn-outline-danger" type="button" @click="confirmDelete">
                Delete account
              </button>
              <button class="btn btn-outline-secondary" type="button" @click="logout">
                Log out
              </button>
            </div>

            <div class="col-12" v-if="badges.length">
              <h3 class="h6 mt-3">Badges</h3>
              <div class="d-flex flex-wrap gap-2">
                <span v-for="b in badges" :key="b" class="badge text-bg-warning">{{ b }}</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/store/auth.js'
import { upsertUser, findByEmail, removeUser } from '@/store/userRegistry'
import { patterns, normEmail } from '@/utils/validation.js'

const router = useRouter()

const user = computed(() => auth.currentUser?.() || auth.state?.user || null)
const isFirebase =
  String(import.meta.env.VITE_USE_FIREBASE || '')
    .trim()
    .toLowerCase() === '1' ||
  String(import.meta.env.VITE_USE_FIREBASE || '')
    .trim()
    .toLowerCase() === 'true'

const name = ref('')
const emailEdit = ref('')
const phone = ref('')

const saving = ref(false)
const saved = ref(false)
const err = ref('')

const providers = ref([])

watch(
  user,
  async (u) => {
    if (!u) return
    name.value = u.name || u.email?.split('@')[0] || ''
    emailEdit.value = u.email || ''
    if (isFirebase) {
      try {
        const { getFirebaseAuth, getFirebaseDb } = await import('@/utils/FirebaseClient')
        const { doc, getDoc } = await import('firebase/firestore')
        const fb = await getFirebaseAuth()
        const db = await getFirebaseDb()
        if (fb.currentUser) {
          providers.value = (fb.currentUser.providerData || []).map((p) => p.providerId)
          const snap = await getDoc(doc(db, 'users', fb.currentUser.uid))
          const localPhone = findByEmail(fb.currentUser.email)?.phone || ''
          phone.value = snap.exists() ? snap.data().phone || localPhone : localPhone
        }
      } catch {
        const me = findByEmail(u.email)
        phone.value = (me && me.phone) || ''
      }
    } else {
      const me = findByEmail(u.email)
      phone.value = (me && me.phone) || ''
    }
  },
  { immediate: true },
)

async function saveProfile() {
  if (!user.value) return
  err.value = ''
  try {
    saving.value = true
    saved.value = false
    if (!patterns.email.test(emailEdit.value)) throw new Error('Enter a valid email')
    if (phone.value && !patterns.phone10.test(phone.value))
      throw new Error('Enter a 10-digit phone')
    if (isFirebase) {
      await auth.updateProfile({ email: user.value.email, name: name.value })
      const nextEmail = normEmail(emailEdit.value)
      if (nextEmail !== normEmail(user.value.email)) {
        await changeEmailFirebase(nextEmail)
      }
      const { getFirebaseAuth, getFirebaseDb } = await import('@/utils/FirebaseClient')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      const fb = await getFirebaseAuth()
      if (fb.currentUser) {
        await setDoc(
          doc(await getFirebaseDb(), 'users', fb.currentUser.uid),
          {
            name: name.value,
            email: nextEmail,
            phone: phone.value || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      }
      const mirrored = findByEmail(nextEmail) || findByEmail(user.value.email)
      if (mirrored)
        upsertUser({ ...mirrored, email: nextEmail, name: name.value, phone: phone.value || '' })
    } else {
      const me = findByEmail(normEmail(user.value.email))
      if (!me) throw new Error('User not found')
      const nextEmail = normEmail(emailEdit.value)
      const exists = findByEmail(nextEmail)
      if (exists && nextEmail !== normEmail(user.value.email))
        throw new Error('Email already in use')
      const next = upsertUser({
        ...me,
        email: nextEmail,
        name: name.value,
        phone: phone.value || '',
      })
      await auth.updateProfile({ email: next.email, name: name.value, phone: phone.value || '' })
    }
    saved.value = true
  } catch (e) {
    err.value = e?.message || 'Save failed'
  } finally {
    saving.value = false
    setTimeout(() => (saved.value = false), 1500)
  }
}

async function getFbAuthBits() {
  const { getFirebaseAuth, getGoogleProvider } = await import('@/utils/FirebaseClient')
  const {
    EmailAuthProvider,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    updateEmail,
    updatePassword,
    deleteUser,
  } = await import('firebase/auth')
  return {
    getFirebaseAuth,
    getGoogleProvider,
    EmailAuthProvider,
    reauthenticateWithCredential,
    reauthenticateWithPopup,
    updateEmail,
    updatePassword,
    deleteUser,
  }
}

async function reauthEmailPassword(oldPass) {
  const { getFirebaseAuth, EmailAuthProvider, reauthenticateWithCredential } = await getFbAuthBits()
  const cu = (await getFirebaseAuth()).currentUser
  if (!cu) throw new Error('Please log in again.')
  if (!oldPass) throw new Error('Enter your current password to continue.')
  const cred = EmailAuthProvider.credential(cu.email, oldPass)
  await reauthenticateWithCredential(cu, cred)
}

async function reauthPopup() {
  const { getFirebaseAuth, getGoogleProvider, reauthenticateWithPopup } = await getFbAuthBits()
  const cu = (await getFirebaseAuth()).currentUser
  if (!cu) throw new Error('Please log in again.')
  const prov = await getGoogleProvider()
  await reauthenticateWithPopup(cu, prov)
}

async function changeEmailFirebase(nextEmail) {
  const { getFirebaseAuth, updateEmail } = await getFbAuthBits()
  const cu = (await getFirebaseAuth()).currentUser
  if (!cu) throw new Error('Please log in again.')
  try {
    await updateEmail(cu, normEmail(nextEmail))
  } catch (e) {
    if (e?.code === 'auth/requires-recent-login') {
      if ((providers.value || []).includes('password')) await reauthEmailPassword(oldPwd.value)
      else await reauthPopup()
      await updateEmail(cu, normEmail(nextEmail))
    } else {
      throw e
    }
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
  if (!user.value) return
  errPwd.value = ''
  pwdOk.value = false
  try {
    changingPwd.value = true
    if (isFirebase) {
      if (!(providers.value || []).includes('password'))
        throw new Error('Google sign-in accounts do not have a password to change.')
      if (!newPwd.value || newPwd.value.length < 8) throw new Error('New password too short')
      await reauthEmailPassword(oldPwd.value)
      const { getFirebaseAuth, updatePassword } = await getFbAuthBits()
      const cu = (await getFirebaseAuth()).currentUser
      await updatePassword(cu, newPwd.value)
    } else {
      await auth.changePassword({
        email: user.value.email,
        oldPassword: oldPwd.value,
        newPassword: newPwd.value,
      })
    }
    pwdOk.value = true
    oldPwd.value = ''
    newPwd.value = ''
  } catch (e) {
    errPwd.value = e?.message || 'Could not change password'
  } finally {
    changingPwd.value = false
  }
}

async function confirmDelete() {
  if (!user.value) return
  const ok = window.confirm('Delete your account permanently?')
  if (!ok) return
  try {
    if (isFirebase) {
      const { getFirebaseAuth, deleteUser } = await getFbAuthBits()
      const fb = await getFirebaseAuth()
      const cu = fb.currentUser
      if (!cu) throw new Error('Please log in again.')
      if ((providers.value || []).includes('password')) await reauthEmailPassword(oldPwd.value)
      else await reauthPopup()
      await deleteUser(cu)
      try {
        const { getFirebaseDb } = await import('@/utils/FirebaseClient')
        const { doc, deleteDoc } = await import('firebase/firestore')
        await deleteDoc(doc(await getFirebaseDb(), 'users', cu.uid))
      } catch {
        //
      }
    } else {
      const me = findByEmail(user.value.email)
      if (me) removeUser(me.id)
    }
    try {
      await auth.logout()
    } catch {
      //
    }
    router.replace({ name: 'home' })
  } catch (e) {
    alert(e?.message || 'Failed to delete account')
  }
}

async function logout() {
  try {
    await auth.logout()
  } finally {
    router.replace({ name: 'home' })
  }
}

const badges = ref([])
;(async () => {
  try {
    const m = await import('@/utils/user-badges.js')
    const loadBadges = m.loadBadges || (() => [])
    badges.value = user.value?.email ? loadBadges(user.value.email) || [] : []
  } catch {
    //
  }
})()
watch(user, async (u) => {
  try {
    const m = await import('@/utils/user-badges.js')
    const loadBadges = m.loadBadges || (() => [])
    badges.value = u?.email ? loadBadges(u.email) || [] : []
  } catch {
    //
  }
})
</script>

<style scoped>
.card {
  background: var(--bs-body-bg);
}
</style>
