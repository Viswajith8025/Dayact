import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/ThemeProvider'
import { InstallProvider } from './lib/install'
import { initTheme } from './lib/theme'
import './index.css'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <InstallProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </InstallProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
