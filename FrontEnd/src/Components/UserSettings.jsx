import { useState, useEffect } from "react";
import "../Styles/UserSettings.css";



const Icon = ({ type, size = 16 }) => {
  const s = { width: size, height: size };
  const icons = {
    user: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    car: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
    truck: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v3h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
    van: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11v6h4l3 3v3h-2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>,
    ev: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    logout: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    bell: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    settings: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M2 12h2M20 12h2" /></svg>,
    camera: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
    trash: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
    qr: <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  };
  return icons[type] || null;
};

const AvatarSVG = () => (
  <svg width="90" height="110" viewBox="0 0 90 110" fill="none">
    <rect width="90" height="110" fill="#0d1a12" />
    <circle cx="45" cy="38" r="22" fill="#1a3528" />
    <ellipse cx="45" cy="95" rx="32" ry="22" fill="#1a3528" />
    <circle cx="45" cy="38" r="16" fill="#2d5a3d" opacity="0.6" />
    <circle cx="45" cy="38" r="10" fill="#1c3528" />
    <rect x="32" y="32" width="26" height="20" rx="4" fill="#243d2f" opacity="0.8" />
    <path d="M38 38 Q45 28 52 38" stroke="#4ade80" strokeWidth="1.5" fill="none" opacity="0.5" />
  </svg>
);

export default function UserSettings() {
  const [activeSection, setActiveSection] = useState("profile");
  const [usuarioData, setUsuarioData] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculo, setVehiculo] = useState({ modelo: "", placa: "", tipo: "", activo: true, id_usuario: usuarioData?.id });
  const [tipo, setTipo] = useState("password");
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario");

  useEffect(() => {

    fetch(`http://localhost:8081/usuario/usuario/${usuario}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((respuesta) => respuesta.json())
      .then((data) => {
        console.log("Datos del usuario:", data);
        setUsuarioData(data);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {

    if (!usuarioData) return;

    fetch(`http://localhost:8081/usuario/vehiculos/${usuarioData.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((respuesta) => respuesta.json())
      .then((data) => {
        setVehiculos(data);
      })
      .catch((error) => {
        console.error(error)
      });
  }, [usuarioData]);

  /* 
    useEffect(() => {
      fetch(`http://localhost:8081/usuario/vehiculos/${usuarioData?.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelo: "MOSS-TRUCK-02",
          placa: "ABC-1234",
          gps: "ROMP-9921-X",
          usuarioId: usuarioData?.id,
        }),
      })
        .then((respuesta) => respuesta.json())
        .then((data) => {
          console.log("Vehículo registrado:", data);
          setVehiculos((prev) => [...prev, data]);
        })
        .catch((error) => {
          console.error("Error registrando vehículo:", error);
        });
    }, [usuarioData]); */


  function registrarVehiculo() {
    fetch(`http://localhost:8081/vehiculo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(vehiculo),
    })
      .then((respuesta) => respuesta.json())
      .then((data) => {
        console.log("Vehículo registrado:", data);
        setVehiculos((prev) => [...prev, data]);
      })
      .catch((error) => {
        console.error("Error registrando vehículo:", error);
      });
  }

  return (
    <>
      <div className="app">
        {/* TOPBAR */}
        <div className="topbar">
          <span className="logo">ROMP GPS</span>
          <nav className="topnav">
            {["Dashboard", "Fleet Monitor", "User Settings"].map(item => (
              <div key={item} className={`topnav-item ${item === "User Settings" ? "active" : ""}`}>{item}</div>
            ))}
          </nav>
          <div className="topbar-right">
            <button className="icon-btn"><Icon type="bell" /></button>
            <button className="icon-btn"><Icon type="settings" /></button>
            <div className="avatar">A</div>
          </div>
        </div>

        <div className="layout">
          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="sidebar-user">
              <div className="sidebar-avatar"><Icon type="user" /></div>
              <div>
                <div className="sidebar-user-name">System Admin</div>
                <div className="sidebar-user-role">Precision Fleet Control</div>
              </div>
            </div>
            <nav className="nav">
              <div className={`nav-item ${activeSection === "profile" ? "active" : ""}`} onClick={() => setActiveSection("profile")}>
                <Icon type="user" />
                <span>General Profile</span>
              </div>
              <div className={`nav-item ${activeSection === "vehicles" ? "active" : ""}`} onClick={() => setActiveSection("vehicles")}>
                <Icon type="car" />
                <span>Vehicle Management</span>
              </div>
            </nav>
            <div className="sidebar-bottom">
              <div className="nav-item"><Icon type="logout" /><span>Log Out</span></div>
            </div>
          </div>

          {/* MAIN */}
          <main className="main">
            {/* GENERAL PROFILE */}
            <div className="section">
              <div className="section-header-row">
                <div>
                  <div className="section-label">CONFIGURATION LAYER 01</div>
                  <div className="section-title">GENERAL PROFILE</div>
                </div>
                <div className="session-token">
                  <label>SESSION TOKEN</label>
                  <span>A-992-TX-04</span>
                </div>
              </div>

              <div className="profile-grid">
                <div className="avatar-card">
                  <div className="avatar-img-wrap">
                    <img className="avatar-img" src={usuarioData?.imagenUrl || <Icon type="user" />} alt="Avatar" />
                    <div className="camera-badge"><Icon type="camera" size={12} /></div>
                  </div>
                  <div className="avatar-upload-title">Upload New Avatar</div>
                  <div className="avatar-upload-desc">Recommended: 400x400px JPG or PNG.</div>
                </div>

                <div className="profile-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>DISPLAY USERNAME</label>
                      <input className="form-input" defaultValue={usuarioData?.usuario} />
                    </div>
                    <div className="form-group">
                      <label>EMAIL ADDRESS</label>
                      <input className="form-input" defaultValue={usuarioData?.correo} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>RESET PASSWORD</label>
                    <div className="password-row">
                      <input className="form-input password" type={tipo} defaultValue="password123" />
                      <button className="change-btn" onClick={() => setTipo(tipo === "password" ? "text" : "password")}>
                        CHANGE
                      </button>
                    </div>
                  </div>
                  <button className="save-btn">SAVE PROFILE CHANGES</button>
                </div>
              </div>
            </div>

            {/* VEHICLE MANAGEMENT */}
            <div className="section">
              <div className="vehicle-section-header">
                <div>
                  <div className="section-label">CONFIGURATION LAYER 02</div>
                  <div className="section-title">VEHICLE MANAGEMENT</div>
                </div>
                <div className="active-fleet-badge">
                  <label>ACTIVE FLEET</label>
                  <span>03 UNITS</span>
                </div>
              </div>

              <div className="vehicle-grid">
                <div className="vehicle-list">
                  {vehiculos.map((v, i) => (
                    <div key={i} className="vehicle-card">
                      <div className="vehicle-icon"><Icon type={v.icon} /></div>
                      <div className="vehicle-field">
                        <label>VEHICLE NAME</label>
                        <span>{v.modelo}</span>
                      </div>
                      <div className="vehicle-field">
                        <label>LICENSE PLATE</label>
                        <span>{v.placa}</span>
                      </div>
                      <div className="vehicle-field">
                        <label>TIPO</label>
                        <span>{v.tipo}</span>
                      </div>
                      <button className="delete-btn"><Icon type="trash" /></button>
                    </div>
                  ))}
                </div>

                <div className="register-panel">
                  <div className="register-coords">
                    <span>LAT: 52.370816</span>
                    <span>LNG: 3.898168</span>
                  </div>
                  <div className="register-title">Register New Vehicle</div>
                  <div className="register-desc">Initialize a new hardware unit within the fleet registry.</div>
                  <div className="register-fields">
                    <div className="form-group">
                      <label style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "1.5px", fontWeight: 600, display: "block", marginBottom: 6 }}>ASSET IDENTIFIER</label>
                      <input className="reg-input" placeholder="TVS SPORT 100" onChange={(e) => setVehiculo(prev => ({ ...prev, modelo: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "1.5px", fontWeight: 600, display: "block", marginBottom: 6 }}>LICENSE PLATE</label>
                      <input className="reg-input" placeholder="e.g. ABC-12H" onChange={(e) => setVehiculo(prev => ({ ...prev, placa: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: 10, color: "var(--text3)", letterSpacing: "1.5px", fontWeight: 600, display: "block", marginBottom: 6 }}>TIPO</label>
                      <select className="reg-input" onChange={(e) => setVehiculo(prev => ({ ...prev, tipo: e.target.value }))}>
                        <option value="MOTO">MOTO</option>
                        <option value="CARRO">CARRO</option>
                      </select>
                    </div>
                    <button className="validate-btn" onClick={registrarVehiculo}>REGISTRAR</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="page-footer">© 2024 ROMP GPS TELEMETRY SYSTEMS</div>
          </main>
        </div>
      </div>
    </>
  );
}
