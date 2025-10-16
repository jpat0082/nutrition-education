<template>
  <button
    class="btn btn-outline-dark w-100 d-flex align-items-center justify-content-center"
    :disabled="busy"
    @click="go"
    type="button"
  >
    <span class="me-2">🔐</span>
    <span v-if="!busy">Continue with Google</span>
    <span v-else>Starting…</span>
  </button>
  <p v-if="err" class="text-danger small mt-2">{{ err }}</p>
</template>

<script setup>
import { ref } from 'vue'
import { auth } from '@/store/auth.js'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()
const busy = ref(false)
const err = ref('')

async function go() {
  err.value = ''
  try {
    busy.value = true
    await auth.loginWithGoogle()
    const dest =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : { name: 'recipes' }
    router.push(dest)
  } catch (e) {
    err.value = e?.message || 'Google sign-in failed'
  } finally {
    busy.value = false
  }
}
</script>
