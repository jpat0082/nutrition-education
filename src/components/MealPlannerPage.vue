<template>
  <div class="p-3 p-md-4 border rounded-3 bg-body mb-3">
    <h1 class="h4 mb-2">Weekly Meal Planner</h1>
    <p class="text-muted mb-0">Plan breakfast / lunch / dinner. Export or print. (Local only)</p>
  </div>

  <div class="row g-3">
    <div class="col-12 col-lg-8">
      <div class="card">
        <div class="card-body">
          <table class="table table-bordered align-middle mb-0 planner-table">
            <thead>
              <tr>
                <th style="width: 120px"></th>
                <th v-for="d in days" :key="d">{{ d }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in meals" :key="m">
                <th class="text-muted">{{ m }}</th>
                <td v-for="(d, di) in days" :key="d">
                  <input
                    v-model.trim="plan[di][m]"
                    class="form-control form-control-sm"
                    :placeholder="m + ' idea…'"
                    @input="save"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <div class="d-flex gap-2 mt-2">
            <button class="btn btn-outline-secondary btn-sm" @click="clearAll">Clear</button>
            <button class="btn btn-outline-primary btn-sm" @click="exportTxt">Export</button>
            <button class="btn btn-outline-dark btn-sm" @click="printIt">Print</button>
          </div>
        </div>
      </div>
    </div>

    <aside class="col-12 col-lg-4">
      <div class="card h-100">
        <div class="card-body">
          <h2 class="h6">Ideas (click to insert)</h2>
          <div class="d-flex flex-wrap gap-1">
            <button
              v-for="s in suggestions"
              :key="s"
              class="btn btn-sm btn-outline-success"
              @click="insert(s)"
            >
              {{ s }}
            </button>
          </div>
          <p class="small text-muted mt-2 mb-0">
            Click a suggestion, then click into a cell and paste (Ctrl/Cmd+V).
          </p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const LSK = 'ne_planner'

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const meals = ['Breakfast', 'Lunch', 'Dinner']
function blank() {
  return days.map(() => ({ Breakfast: '', Lunch: '', Dinner: '' }))
}

const plan = ref(
  (() => {
    try {
      const raw = localStorage.getItem(LSK)
      return raw ? JSON.parse(raw) : blank()
    } catch {
      return blank()
    }
  })(),
)

function save() {
  localStorage.setItem(LSK, JSON.stringify(plan.value))
}
function clearAll() {
  plan.value = blank()
  save()
}

const suggestions = [
  'Oats + berries',
  'Greek yogurt + nuts',
  'Egg & avocado toast',
  'Salad bowl',
  'Chicken & veg stir-fry',
  'Lentil curry + rice',
  'Soup + wholegrain roll',
  'Grilled fish + veg',
  'Tofu & quinoa',
  'Fruit + hummus wrap',
]
function insert(s) {
  navigator.clipboard?.writeText?.(s)
}
function exportTxt() {
  const lines = ['WEEKLY MEAL PLAN']
  days.forEach((d, i) => {
    lines.push(`\n${d}`)
    meals.forEach((m) => lines.push(`${m}: ${plan.value[i][m] || ''}`))
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'meal-plan.txt'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
function printIt() {
  window.print()
}
</script>

<style scoped>
.planner-table th,
.planner-table td {
  background: var(--bs-body-bg);
}
</style>
