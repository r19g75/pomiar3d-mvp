import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'

const updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm('Dostępna jest nowa wersja Pomiar 3D. Zaktualizować teraz?')) void updateSW(true)
  },
  onOfflineReady() {
    console.info('Pomiar 3D jest gotowy do pracy offline.')
  }
})

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
