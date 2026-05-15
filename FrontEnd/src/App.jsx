import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Hero from './components/Hero'
import Nosotros from './components/Nosotros'
import Producto from './components/Producto'
import Pricing from './components/Pricing'
import Equipo from './components/Equipo'
import Footer from './components/footer'
import Login from './Components/Login'
import './Styles/App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={
        <>
          <NavBar />
          <Hero />
          <Nosotros />
          <Producto />
          <Pricing />
          <Equipo />
          <Footer />
        </>
      } />
      <Route path="/login" element={
        <Login />
      } />
    </Routes>
  )
}

export default App
