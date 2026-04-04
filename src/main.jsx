import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import logo from './logo.jpg'
import './index.css'

const setFavicon = (href) => {
  const icon = document.querySelector("link[rel~='icon']")
  if (icon) {
    icon.href = href
  } else {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = href
    document.head.appendChild(link)
  }

  const appleIcon = document.querySelector("link[rel='apple-touch-icon']")
  if (appleIcon) {
    appleIcon.href = href
  }
}

setFavicon(logo)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
