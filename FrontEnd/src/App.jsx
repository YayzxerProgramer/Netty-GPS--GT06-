import { useState } from 'react'
import NavBar from './components/NavBar'
import Hero from './components/Hero'
import Nosotros from './components/Nosotros'
import Producto from './components/Producto'
import Pricing from './components/Pricing'
import Equipo from './components/Equipo'
import Footer from './components/footer'
import Login from './components/Login'
import './App.css'


function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <NavBar onOpenLogin={() => setShowLogin(true)} />
      {showLogin ? (
        <Login onBack={() => setShowLogin(false)} />
      ) : (
        <>
          <Hero />
          <Nosotros />
          <Producto />
          <Pricing />
          <Equipo />
          <Footer />
        </>
      )}
    </>
  )
}

export default App
