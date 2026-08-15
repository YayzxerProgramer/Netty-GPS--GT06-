import { Routes, Route } from 'react-router-dom'
import NavBar from './Components/NavBar'
import Hero from './Components/Hero'
import Nosotros from './Components/Nosotros'
import Producto from './Components/Producto'
import Pricing from './Components/Pricing'
import Equipo from './Components/Equipo'
import Footer from './Components/Footer'
import Login from './Components/Login'
import PanelControl from './Components/PanelControl'
import PanelUsuario from './Components/PerfilUsuario'
import Registro from './Components/Registro'
import AuthCallback from './Components/AuthCallback'
import CambiarContrasena from './Components/CambiarContrasena'
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
      <Route path='/panel-control' element={
        <PanelControl />
      } />
      <Route path="/configuracion" element={
        <PanelUsuario />
      } />
      <Route path="/registro" element={
        <Registro />
      } />
      <Route path="/auth/callback" element={
        <AuthCallback />
      } />
      <Route path="/cambiar-contrasena" element={
        <CambiarContrasena />
      } />
    </Routes>
  )
}

export default App
