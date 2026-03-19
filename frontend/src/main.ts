import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primevue/themes/aura'

import App from './App.vue'
import './style.css'
import 'primeicons/primeicons.css'

import router from './router'
import { pinia } from './stores/pinia'
import { useAuthStore } from './stores/authStore'
import { setupHttpInterceptors } from './services/http'
import { i18n } from './i18n'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(ToastService)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: false,
    },
  },
})

const authStore = useAuthStore(pinia)
authStore.initializeAuth()

setupHttpInterceptors({ pinia, router })

app.mount('#app')
