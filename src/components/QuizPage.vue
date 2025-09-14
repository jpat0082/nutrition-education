<template>
  <div class="p-3 p-md-4 border rounded-3 bg-body mb-3">
    <h1 class="h4 mb-2">Nutrition Quiz</h1>
    <p class="text-muted mb-0">Short MCQ—test your label & food-group basics.</p>
  </div>

  <div class="card">
    <div class="card-body">
      <ol class="mb-3">
        <li v-for="(q, qi) in quiz" :key="qi" class="mb-3">
          <div class="fw-semibold">{{ q.t }}</div>
          <div class="d-flex flex-column gap-1 mt-1">
            <label v-for="(opt, oi) in q.opts" :key="oi" class="form-check">
              <input
                class="form-check-input"
                type="radio"
                :name="'q' + qi"
                :value="oi"
                v-model="ans[qi]"
              />
              <span class="form-check-label">{{ opt }}</span>
            </label>
          </div>
          <div v-if="show && ans[qi] !== undefined" class="small mt-1">
            <span v-if="ans[qi] === q.a" class="text-success">Correct!</span>
            <span v-else class="text-danger">Oops—answer: {{ q.opts[q.a] }}</span>
          </div>
        </li>
      </ol>

      <div class="d-flex gap-2">
        <button class="btn btn-primary" @click="grade">Check</button>
        <button class="btn btn-outline-secondary" @click="reset">Reset</button>
        <div v-if="show" class="ms-auto">
          Score: <strong>{{ score }}/{{ quiz.length }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const quiz = [
  {
    t: 'On labels, “low sugar” is roughly…',
    opts: ['< 5g/100g', '< 15g/100g', '< 25g/100g'],
    a: 0,
  },
  {
    t: 'Half your plate should be mostly…',
    opts: ['Grains', 'Vegetables & fruits', 'Protein'],
    a: 1,
  },
  {
    t: 'Best source of dietary fiber?',
    opts: ['White bread', 'Fruits/veg/legumes', 'Butter'],
    a: 1,
  },
]
const ans = reactive({})
const show = ref(false)
const score = ref(0)
function grade() {
  show.value = true
  score.value = quiz.reduce((s, q, i) => s + (ans[i] === q.a ? 1 : 0), 0)
}
function reset() {
  for (const k of Object.keys(ans)) delete ans[k]
  show.value = false
  score.value = 0
}
</script>
