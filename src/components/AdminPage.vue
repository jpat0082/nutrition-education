<template>
  <div class="card">
    <div class="card-body">
      <h2 class="h5 mb-3">Admin Dashboard</h2>
      <p class="mb-2">Users (read-only view from localStorage):</p>
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.email">
              <td>{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>
                <span class="badge text-bg-dark text-uppercase">{{ u.role }}</span>
              </td>
              <td>
                <span v-if="u.verified" class="text-success">Yes</span>
                <span v-else class="text-danger">No</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="small text-muted mb-0">
        Seed admin (email: admin@example.com, pass: Admin@1234) is auto-created if none exists.
      </p>
    </div>
  </div>
  <AdminDashboardPage />
</template>

<script setup>
import { computed } from 'vue'
import { auth } from '../store/auth.js'
import AdminDashboardPage from './AdminDashboardPage.vue'
const users = computed(() =>
  auth.state.users.map((u) => ({
    name: u.name,
    email: u.email,
    role: u.role,
    verified: u.verified,
  })),
)
</script>
