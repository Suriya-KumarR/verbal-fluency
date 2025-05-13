import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import ModesPage from './components/ModesPage.vue'
import TranscriptionMode from './components/TranscriptionMode.vue'
import QAMode from './components/QAMode.vue'
import './assets/app.css';
import './assets/overlap-warning.css'
import './assets/word-actions.css'

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'modes',
      component: ModesPage
    },
    {
      path: '/transcription',
      name: 'transcription',
      component: TranscriptionMode
    },
    {
      path: '/qa',
      name: 'qa',
      component: QAMode
    }
  ]
})

// Create and mount the Vue application with the router
const app = createApp(App)
app.use(router)
app.mount('#app')
