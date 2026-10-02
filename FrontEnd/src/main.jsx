import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'

// Silenciar advertencias informativas de deprecación de Google Maps en desarrollo
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('google.maps.Marker is deprecated') ||
     args[0].includes('google.maps.places.Autocomplete is not available') ||
     args[0].includes('google.maps.DirectionsRenderer is deprecated') ||
     args[0].includes('React Router Future Flag Warning'))
  ) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="523594818943-0kibahdpukmp2uce2ub672r4r0a8s0at.apps.googleusercontent.com">
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)