import { reactive } from 'vue'
export const net = reactive({ online: navigator.onLine })

function update() {
  net.online = navigator.onLine
}
window.addEventListener('online', update)
window.addEventListener('offline', update)
