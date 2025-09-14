// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// Core pages
import HomePage from '../components/HomePage.vue'
import RecipesPage from '../components/RecipesPage.vue'
import LoginPage from '../components/LoginPage.vue'
import RegisterPage from '../components/RegisterPage.vue'
import VerifyEmailPage from '../components/VerifyEmailPage.vue'
import ProfilePage from '../components/ProfilePage.vue'
import AdminPage from '../components/AdminPage.vue'
import NotFound from '../components/NotFound.vue'
import TwoFactorPage from '../components/TwoFactorPage.vue'

// Secured pages
import ToolsPage from '../components/ToolsPage.vue'
import MealPlannerPage from '../components/MealPlannerPage.vue'
import QuizPage from '../components/QuizPage.vue'
import AboutPage from '../components/AboutPage.vue'

// NEW: access message page
import AccessRequiredPage from '../components/AccessRequiredPage.vue'

import { auth } from '../store/auth.js'

const routes = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/recipes', name: 'recipes', component: RecipesPage },

  // 🔒 must be logged in
  { path: '/tools', name: 'tools', component: ToolsPage, meta: { requiresAuth: true } },
  { path: '/planner', name: 'planner', component: MealPlannerPage, meta: { requiresAuth: true } },
  { path: '/quiz', name: 'quiz', component: QuizPage, meta: { requiresAuth: true } },
  { path: '/about', name: 'about', component: AboutPage },

  // Auth pages
  { path: '/login', name: 'login', component: LoginPage, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterPage, meta: { guestOnly: true } },
  { path: '/verify', name: 'verify', component: VerifyEmailPage, meta: { guestOnly: true } },
  { path: '/2fa', name: 'twofa', component: TwoFactorPage, meta: { guestOnly: true } },

  // Profile/Admin
  { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: { requiresAuth: true, adminOnly: true },
  },

  // Access message page (guest can see this)
  {
    path: '/access-required',
    name: 'access-required',
    component: AccessRequiredPage,
    meta: { guestOnly: true },
  },

  // 404
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const user = auth.currentUser?.() || auth.state?.user || null

  // Need login?
  if (to.meta?.requiresAuth && !user) {
    // show the message page instead of popping alert / showing login
    return { name: 'access-required', query: { redirect: to.fullPath } }
  }

  // Admin-only?
  if (to.meta?.adminOnly && user?.role !== 'admin') {
    return { name: 'home' }
  }

  // Guest-only (login/register/verify/2fa)
  if (to.meta?.guestOnly && user) {
    return { name: 'recipes' }
  }

  return true
})

router.afterEach(() => {
  setTimeout(() => document.getElementById('main')?.focus(), 0)
})

export default router
