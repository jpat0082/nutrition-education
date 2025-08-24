import { createRouter, createWebHistory } from 'vue-router'
import Home from '../components/HomePage.vue'
import Recipes from '../components/Recipes.vue'
import Login from '../components/LoginPage.vue'
import Register from '../components/Register.vue'
import Profile from '../components/Profile.vue'
import Admin from '../components/Admin.vue'
import NotFound from '../components/NotFound.vue'
import { auth } from '../store/auth.js'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/recipes', name: 'recipes', component: Recipes },
  { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
  { path: '/profile', name: 'profile', component: Profile, meta: { requiresAuth: true } },
  {
    path: '/admin',
    name: 'admin',
    component: Admin,
    meta: { requiresAuth: true, adminOnly: true },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Route guards
router.beforeEach((to) => {
  const user = auth.currentUser()
  if (to.meta.requiresAuth && !user) {
    return { name: 'login' }
  }
  if (to.meta.adminOnly && user?.role !== 'admin') {
    return { name: 'home' }
  }
  if (to.meta.guestOnly && user) {
    return { name: 'home' }
  }
  return true
})

export default router
