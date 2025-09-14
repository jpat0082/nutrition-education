<template>
  <div class="row g-3">
    <section class="col-12">
      <div class="p-3 p-md-4 border rounded-3 bg-body">
        <h1 class="h4 mb-2">Health Tools & Trackers</h1>
        <p class="text-muted mb-0">
          All data stays on this device (localStorage). No account required.
        </p>
      </div>
    </section>

    <!-- Sugar Tracker -->
    <section class="col-12 col-lg-6">
      <div class="card h-100">
        <div class="card-body">
          <h2 class="h6">Daily Sugar Tracker</h2>
          <form class="row g-2" @submit.prevent="addSugar">
            <div class="col-8">
              <label class="form-label small text-muted">Grams (0–200)</label>
              <input
                v-model.number="sugarGrams"
                class="form-control"
                type="number"
                min="0"
                max="200"
                required
              />
            </div>
            <div class="col-4 d-grid">
              <label class="form-label small text-muted">&nbsp;</label>
              <button class="btn btn-primary">Add</button>
            </div>
          </form>
          <p class="small text-muted mt-2">
            Goal: {{ sugarGoal }} g/day (WHO: keep free sugars low).
          </p>
          <div
            class="progress"
            role="progressbar"
            :aria-valuenow="sugarToday"
            aria-valuemin="0"
            :aria-valuemax="sugarGoal"
          >
            <div
              class="progress-bar"
              :style="{ width: Math.min(100, Math.round((sugarToday / sugarGoal) * 100)) + '%' }"
            >
              {{ sugarToday }}g
            </div>
          </div>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-sm btn-outline-secondary" @click="setGoal(50)" type="button">
              Goal 50g
            </button>
            <button class="btn btn-sm btn-outline-secondary" @click="setGoal(30)" type="button">
              Goal 30g
            </button>
            <button class="btn btn-sm btn-outline-danger ms-auto" @click="clearSugar" type="button">
              Clear today
            </button>
          </div>
          <p class="small text-muted mt-2 mb-0">Tip: Check labels “per 100g”. Under 5g is “low”.</p>
        </div>
      </div>
    </section>

    <!-- BMI / Water -->
    <section class="col-12 col-lg-6">
      <div class="card h-100">
        <div class="card-body">
          <h2 class="h6">Quick Calculators</h2>
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label class="form-label small text-muted">Height (cm)</label>
              <input
                v-model.number="height"
                class="form-control"
                type="number"
                min="50"
                max="300"
              />
              <label class="form-label small text-muted mt-2">Weight (kg)</label>
              <input
                v-model.number="weight"
                class="form-control"
                type="number"
                min="10"
                max="500"
              />
              <div class="mt-2">
                <button class="btn btn-sm btn-outline-primary" @click="calcBMI" type="button">
                  Compute BMI
                </button>
                <div class="small mt-2" v-if="bmi">
                  BMI: <strong>{{ bmi.toFixed(1) }}</strong>
                  <span class="text-muted">({{ bmiClass }})</span>
                </div>
              </div>
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label small text-muted">Water tracker (glasses)</label>
              <div class="d-flex align-items-center gap-2">
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="water = Math.max(0, water - 1)"
                >
                  −
                </button>
                <span class="fs-5">{{ water }}</span>
                <button class="btn btn-sm btn-outline-secondary" @click="water++">+</button>
                <button class="btn btn-sm btn-outline-danger ms-auto" @click="water = 0">
                  Reset
                </button>
              </div>
              <p class="small text-muted mt-2 mb-0">Aim for regular hydration through the day.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

/* sugar tracker (per day) */
const SKEY = 'ne_tools_sugar'
const GKEY = 'ne_tools_sugar_goal'
const sugarGoal = ref(Number(localStorage.getItem(GKEY) || 50))
const sugarToday = ref(Number(localStorage.getItem(SKEY) || 0))
const sugarGrams = ref(0)
function addSugar() {
  const g = Number(sugarGrams.value || 0)
  if (Number.isNaN(g) || g < 0 || g > 200) return
  sugarToday.value = Math.min(999, sugarToday.value + g)
  sugarGrams.value = 0
}
function clearSugar() {
  sugarToday.value = 0
}
function setGoal(n) {
  sugarGoal.value = n
}
watch(sugarToday, (v) => localStorage.setItem(SKEY, String(v)))
watch(sugarGoal, (v) => localStorage.setItem(GKEY, String(v)))

/* BMI + water */
const height = ref(Number(localStorage.getItem('ne_tools_h') || 170))
const weight = ref(Number(localStorage.getItem('ne_tools_w') || 70))
const bmi = ref(0)
const bmiClass = computed(() => {
  if (!bmi.value) return ''
  const x = bmi.value
  if (x < 18.5) return 'Underweight'
  if (x < 25) return 'Normal'
  if (x < 30) return 'Overweight'
  return 'Obese'
})
function calcBMI() {
  const h = Number(height.value),
    w = Number(weight.value)
  if (h > 0 && w > 0) bmi.value = w / (h / 100) ** 2
}
watch([height, weight], ([h, w]) => {
  localStorage.setItem('ne_tools_h', String(h))
  localStorage.setItem('ne_tools_w', String(w))
})

const water = ref(Number(localStorage.getItem('ne_tools_water') || 0))
watch(water, (v) => localStorage.setItem('ne_tools_water', String(v)))
</script>

<style scoped>
.card {
  background: var(--bs-body-bg);
}
.progress {
  height: 26px;
}
</style>
