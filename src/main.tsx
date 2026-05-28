import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './graph/client'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { App } from './App'
import './index.css'

await msalInstance.initialize()
await msalInstance.handleRedirectPromise()
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Elemento #root não encontrado no DOM')

createRoot(rootEl!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </MsalProvider>
  </StrictMode>
)

