<template>
  <div class="container py-3">
    <h1 class="h5 mb-3">Book an Appointment</h1>

    <div class="vstack gap-3">
      <div>
        <label class="form-label">Title</label>
        <input v-model.trim="title" class="form-control" placeholder="Diet consult" />
      </div>

      <div>
        <label class="form-label">Start</label>
        <input v-model="start" class="form-control" type="datetime-local" />
      </div>

      <div>
        <label class="form-label">End</label>
        <input v-model="end" class="form-control" type="datetime-local" />
      </div>

      <div>
        <button class="btn btn-primary" :disabled="saving" @click="submit">
          {{ saving ? 'Booking…' : 'Create booking' }}
        </button>
        <span class="text-success ms-2" v-if="ok">Booked!</span>
        <span class="text-danger ms-2" v-if="err">{{ err }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { callCreateBooking } from '@/utils/functionsClient'

const title = ref('Diet consult')
const start = ref('')
const end = ref('')

const saving = ref(false)
const ok = ref(false)
const err = ref('')

async function submit() {
  err.value = ''
  ok.value = false
  if (!start.value || !end.value) {
    err.value = 'Select start and end'
    return
  }
  try {
    saving.value = true
    await callCreateBooking({ title: title.value, startISO: start.value, endISO: end.value })
    ok.value = true
  } catch (e) {
    err.value = e?.message || 'Failed'
  } finally {
    saving.value = false
  }
}
</script>
