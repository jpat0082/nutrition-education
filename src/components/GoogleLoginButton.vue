<template>
  <button class="btn btn-outline-dark w-100" @click="go" type="button">
    <span class="me-2">🔐</span> Continue with Google
  </button>
</template>

<script setup>
import { auth } from '@/store/auth.js'
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()
async function go() {
  await auth.loginWithGoogle()
  const dest =
    typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : { name: 'recipes' }
  router.push(dest)
}
</script>
