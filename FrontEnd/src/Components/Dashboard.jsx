/**
 * Armazón del panel administrativo: barra superior, barra lateral y enrutado
 * entre vistas.
 *
 * Antes este archivo era una sola pantalla. Los cinco enlaces de la barra
 * lateral llamaban a setActiveNav, que solo movía el resaltado: se podía
 * pulsar "Fleet Monitor" o "Analytics" y el contenido no cambiaba. Ahora cada
 * enlace tiene su vista, en Components/admin/.
 *
 * La búsqueda vive aquí y baja a la vista activa: es una caja única en la
 * barra superior, así que debe filtrar lo que hay debajo en cada momento.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerUsuario, cerrarSesion } from "../Service/sesion";

import NavIcon from "./admin/Iconos";
import VistaResumen from "./admin/VistaResumen";
import VistaFlota from "./admin/VistaFlota";
import VistaClientes from "./admin/VistaClientes";
import VistaUnidadesGps from "./admin/VistaUnidadesGps";
import VistaAnalitica from "./admin/VistaAnalitica";

import "../Styles/Dashboard.css";
import "../Styles/PanelVistas.css";

const SECCIONES = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "fleet", label: "Fleet Monitor", icon: "fleet" },
  { id: "clients", label: "Client Registry", icon: "clients" },
  { id: "gps", label: "GPS Units", icon: "gps" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
];

const MARCADOR_BUSQUEDA = {
  dashboard: "Buscar usuario, placa o IMEI...",
  fleet: "Filtrar flota por placa o IMEI...",
  clients: "Buscar por nombre, usuario o correo...",
  gps: "Buscar por placa o IMEI...",
  analytics: "La analítica no se filtra por búsqueda",
};

export default function Dashboard() {
  const [seccion, setSeccion] = useState("dashboard");
  const [busqueda, setBusqueda] = useState("");
  const [abrirAlta, setAbrirAlta] = useState(false);
  const navigate = useNavigate();
  const usuario = obtenerUsuario() || "ADMIN";

  const irA = (destino) => {
    setSeccion(destino);
    // Un filtro escrito para la vista anterior casi nunca aplica a la
    // siguiente, y dejarlo puesto hacía parecer que la nueva estaba vacía.
    setBusqueda("");
    // Navegar a mano nunca debe abrir el alta: solo la abre el botón.
    setAbrirAlta(false);
  };

  const manejarCerrarSesion = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  const registrarDispositivo = () => {
    irA("gps");
    setAbrirAlta(true);
  };

  return (
    <div className="app">
      <div className="topbar">
        <span className="logo">ROMP GPS</span>
        <div className="search">
          <NavIcon type="search" />
          <input
            className="search-input"
            type="search"
            value={busqueda}
            disabled={seccion === "analytics"}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={MARCADOR_BUSQUEDA[seccion]}
          />
        </div>
        <div className="topbar-right">
          <button className="icon-btn"><NavIcon type="bell" /></button>
          <button className="icon-btn" onClick={() => navigate("/configuracion")} title="Mi perfil">
            <NavIcon type="settings" />
          </button>
          <button className="icon-btn"><NavIcon type="help" /></button>
          <div className="user-info">
            <div className="user-text">
              <div className="user-name">{usuario.toUpperCase()}</div>
              <div className="user-status">SESIÓN ACTIVA</div>
            </div>
            <div className="avatar">{usuario.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="layout">
        <div className="sidebar">
          <div className="sidebar-user">
            <div className="sidebar-user-icon">
              <NavIcon type="user" />
              <div>
                <div className="sidebar-user-name">System</div>
                <div className="sidebar-user-role">Precision Fleet Control</div>
              </div>
            </div>
          </div>

          <nav className="nav">
            {SECCIONES.map((item) => (
              <div
                key={item.id}
                className={`nav-item ${seccion === item.id ? "active" : ""}`}
                onClick={() => irA(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && irA(item.id)}
              >
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>

          <div className="sidebar-bottom">
            {/* Este botón no tenía onClick. Ahora abre el alta en GPS Units. */}
            <button className="register-btn" onClick={registrarDispositivo}>
              <NavIcon type="plus" />
              Register New Device
            </button>
            <div className="nav-item nav-item-pie" onClick={() => navigate("/configuracion")}>
              <NavIcon type="user" /><span>Mi perfil</span>
            </div>
            <div className="nav-item nav-item-pie" onClick={manejarCerrarSesion}>
              <NavIcon type="logout" /><span>Cerrar sesión</span>
            </div>
          </div>
        </div>

        <main className="main">
          {seccion === "dashboard" && <VistaResumen busqueda={busqueda} irA={irA} />}
          {seccion === "fleet" && <VistaFlota busqueda={busqueda} />}
          {seccion === "clients" && <VistaClientes busqueda={busqueda} />}
          {seccion === "gps" && (
            /* La key cambia al pulsar "Register New Device", remontando la
               vista con el formulario de alta ya abierto. Sin ella, pulsarlo
               estando ya en GPS Units no abriria nada. */
            <VistaUnidadesGps
              key={abrirAlta ? "gps-alta" : "gps-lista"}
              busqueda={busqueda}
              abrirAltaAlEntrar={abrirAlta}
            />
          )}
          {seccion === "analytics" && <VistaAnalitica />}

          <div className="page-footer">© 2024 ROMP GPS TELEMETRY SYSTEMS</div>
        </main>
      </div>
    </div>
  );
}
