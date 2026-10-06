import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './stores/useGameStore'

// Dev-only handle for debugging in the console
if (import.meta.env.DEV) {
  (window as unknown as { pathdle: typeof useGameStore }).pathdle = useGameStore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
