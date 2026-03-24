import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Google Maps SDK 로드
const key = import.meta.env.VITE_GOOGLE_MAPS_KEY
console.log('🔑 API Key 존재:', !!key)

const script = document.createElement('script')
script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=beta&callback=initMap`
script.async = true
script.defer = true

// SDK 로드 완료 콜백
;(window as any).initMap = () => {
  console.log('✅ Google Maps SDK 로드 완료!')
}

document.head.appendChild(script)

createRoot(document.getElementById('root')!).render(
  <App />
)