import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// MSAL names every popup window "msal.<clientId>..." (PopupClient.generatePopupName).
// Never mount BrowserRouter inside an MSAL popup window, otherwise React Router's
// <Navigate to="/login" replace /> calls history.replaceState and strips the
// #code=... OAuth hash before the parent window's monitorPopupForHash polling loop
// reads it, causing "hash_empty_error".
const hashAndSearch = `${window.location.hash || ''}${window.location.search || ''}`
const isMsalPopup =
  (typeof window.name === 'string' && window.name.startsWith('msal.')) ||
  (Boolean(window.opener && window.opener !== window) &&
    /(?:^|[#&?])(code|id_token|access_token|error|state|client_info)=/i.test(hashAndSearch))

if (!isMsalPopup) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
