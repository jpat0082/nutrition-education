import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'

// Bootstrap CSS (responsiveness)
import 'bootstrap/dist/css/bootstrap.min.css'

// Global styles
import './assets/styles.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
