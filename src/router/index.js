import { createRouter, createWebHistory } from 'vue-router'

import HomePage from '../components/HomePage.vue'
import RecipesPage from '../components/RecipesPage.vue'
import LoginPage from '../components/LoginPage.vue'
import RegisterPage from '../components/RegisterPage.vue'
import VerifyEmailPage from '../components/VerifyEmailPage.vue'
import ProfilePage from '../components/ProfilePage.vue'
import AdminPage from '../components/AdminPage.vue'
import NotFound from '../components/NotFound.vue'
import TwoFactorPage from '../components/TwoFactorPage.vue'
import ToolsPage from '../components/ToolsPage.vue'
import MealPlannerPage from '../components/MealPlannerPage.vue'
import QuizPage from '../components/QuizPage.vue'
import AboutPage from '../components/AboutPage.vue'
import AccessRequiredPage from '../components/AccessRequiredPage.vue'

import AdminDashboardPage from '@/components/AdminDashboardPage.vue'

const EventsLocations = () => import('@/components/EventsLocationsPage.vue')

import { auth } from '../store/auth.js'

const routes = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/recipes', name: 'recipes', component: RecipesPage },

  { path: '/tools', name: 'tools', component: ToolsPage, meta: { requiresAuth: true } },
  { path: '/events', name: 'events', component: EventsLocations, meta: { requiresAuth: true } },
  { path: '/planner', name: 'planner', component: MealPlannerPage, meta: { requiresAuth: true } },
  { path: '/quiz', name: 'quiz', component: QuizPage, meta: { requiresAuth: true } },
  { path: '/about', name: 'about', component: AboutPage },

  { path: '/login', name: 'login', component: LoginPage, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterPage, meta: { guestOnly: true } },
  { path: '/verify', name: 'verify', component: VerifyEmailPage, meta: { guestOnly: true } },
  { path: '/2fa', name: 'twofa', component: TwoFactorPage, meta: { guestOnly: true } },

  { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },

  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/admin-dashboard',
    name: 'admin-dashboard',
    component: AdminDashboardPage,
    meta: { requiresAuth: true, adminOnly: true },
  },

  {
    path: '/access-required',
    name: 'access-required',
    component: AccessRequiredPage,
    meta: { guestOnly: true },
  },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const user = auth.currentUser?.() || auth.state?.user || null
  const isAuthed = !!user

  if (to.meta?.requiresAuth && !isAuthed) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta?.guestOnly && isAuthed) {
    return { name: 'recipes' }
  }

  if (to.meta?.adminOnly && user?.role !== 'admin') {
    return { name: 'home' }
  }

  return true
})

router.afterEach(() => {
  setTimeout(() => document.getElementById('main')?.focus(), 0)
})

export default router
