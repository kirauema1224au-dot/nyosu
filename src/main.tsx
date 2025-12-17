import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/fx.css'
import './styles/space.css'
import { getFx, setFx } from './lib/fx'

const container = document.getElementById('root')!
// Initialize FX mode from storage/system
try { setFx(getFx()) } catch { }
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
