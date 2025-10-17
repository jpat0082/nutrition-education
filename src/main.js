import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'

import 'mapbox-gl/dist/mapbox-gl.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import './assets/styles.css'

import { initTheme } from './utils/theme.js'
import { registerSW } from './pwa/registerSW.js'

initTheme()
registerSW()
console.log('VITE_USE_FIREBASE =', import.meta.env.VITE_USE_FIREBASE)

createApp(App).use(router).mount('#app')
