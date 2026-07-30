import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/pdf-setup'
import { trackVisit } from './lib/visit-tracker'
import App from './App'

// Log a page view for admin dashboard analytics.
// Fire-and-forget: runs once per page load, silently fails.
trackVisit()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
