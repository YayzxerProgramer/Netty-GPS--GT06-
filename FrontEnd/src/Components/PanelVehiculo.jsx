import { useState, useEffect, useRef } from "react";
import "../Styles/PanelVehiculo.css";

function TarjetaVehiculo({ vehiculo }) {
    return (
        <article className="tarjeta-vehiculo-configuracion" role="row">
            <div className="tarjeta-vehiculo__celda-imagen tarjeta-vehiculo__imagen-envoltorio">
                <div className="avatar-vehiculo-placeholder">
                    <span className="material-symbols-outlined" style={{ fontSize: "2rem" }}>
                        {vehiculo.tipo === "MOTO" ? "motorcycle" : "directions_car"}
                    </span>
                </div>
            </div>
            <div className="tarjeta-vehiculo__celda-modelo">
                <h3 className="tarjeta-vehiculo__nombre">{vehiculo.modelo}</h3>
                <p className="tarjeta-vehiculo__serie">IMEI: {vehiculo.imei}</p>
            </div>
            <div className="tarjeta-vehiculo__celda-tipo">
                <span className="tarjeta-vehiculo__tipo-etiqueta">
                    <span className="material-symbols-outlined" aria-hidden="true">
                        {vehiculo.tipo === "MOTO" ? "motorcycle" : "directions_car"}
                    </span>
                    {vehiculo.tipo}
                </span>
            </div>
            <div className="tarjeta-vehiculo__celda-placa">
                <span className="tarjeta-vehiculo__placa">{vehiculo.placa}</span>
            </div>
            <div className="tarjeta-vehiculo__celda-estado">
                <div className="tarjeta-vehiculo__estado">
                    <span className={`tarjeta-vehiculo__indicador tarjeta-vehiculo__indicador--${vehiculo.activo ? "activo" : "offline"}`} aria-hidden="true" />
                    <span className={`tarjeta-vehiculo__texto-estado tarjeta-vehiculo__texto-estado--${vehiculo.activo ? "activo" : "offline"}`}>
                        {vehiculo.activo ? "Activo" : "Inactivo"}
                    </span>
                </div>
            </div>
            <div className="tarjeta-vehiculo__celda-acciones tarjeta-vehiculo__acciones">
                <button className="tarjeta-vehiculo__boton-accion" type="button" aria-label="Ver ubicación en vivo">
                    <span className="material-symbols-outlined">near_me</span>
                </button>
                <button className="tarjeta-vehiculo__boton-accion" type="button" aria-label="Configuración del vehículo">
                    <span className="material-symbols-outlined">settings</span>
                </button>
            </div>
        </article>
    );
}

function ModalRegistro({ visible, onCerrar, onRegistrado, usuarioId, token }) {
    const [formulario, setFormulario] = useState({
        modelo: "",
        placa: "",
        tipo: "MOTO",
        imei: "",
    });
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const manejarTeclado = (e) => { if (e.key === "Escape" && visible) onCerrar(); };
        document.addEventListener("keydown", manejarTeclado);
        return () => document.removeEventListener("keydown", manejarTeclado);
    }, [visible, onCerrar]);

    useEffect(() => {
        document.body.style.overflow = visible ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [visible]);

    // Limpiar al abrir
    useEffect(() => {
        if (visible) {
            setFormulario({ modelo: "", placa: "", tipo: "MOTO", imei: "" });
            setError("");
        }
    }, [visible]);

    const manejarCambio = (e) =>
        setFormulario((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const manejarConfirmar = async () => {
        setError("");

        if (!formulario.modelo.trim()) return setError("El modelo es obligatorio.");
        if (!formulario.placa.trim()) return setError("La placa es obligatoria.");
        

        setCargando(true);
        try {
            const payload = {
                modelo: formulario.modelo.trim(),
                placa: formulario.placa.trim().toUpperCase(),
                tipo: formulario.tipo,
                imei: formulario.imei.trim() || null,
                id_usuario: usuarioId,
                activo: true,
            };

            const res = await fetch("http://localhost:8081/vehiculo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Error al registrar el vehículo.");
                return;
            }

            onRegistrado(); // recarga la lista
            onCerrar();
        } catch (e) {
            setError("Error de conexión con el servidor.");
        } finally {
            setCargando(false);
        }
    };

    if (!visible) return null;

    return (
        <div className="modal-fondo modal-fondo--visible" role="dialog" aria-modal="true"
            aria-labelledby="modal-titulo-heading"
            onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
            <div className="modal-contenido">
                <div className="modal-cabecera">
                    <div>
                        <h2 className="modal-titulo" id="modal-titulo-heading">Nuevo Vehículo</h2>
                        <p className="modal-subtitulo">Registra una nueva unidad en tu flota.</p>
                    </div>
                    <button className="modal-boton-cerrar" type="button" onClick={onCerrar} aria-label="Cerrar modal">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="formulario">

                    {/* Modelo */}
                    <div className="formulario__grupo">
                        <label className="formulario__etiqueta" htmlFor="campo-modelo">
                            Modelo del Vehículo
                        </label>
                        <input
                            className="formulario__campo"
                            id="campo-modelo"
                            name="modelo"
                            type="text"
                            placeholder="Ej: Toyota Hilux 2022"
                            autoComplete="off"
                            value={formulario.modelo}
                            onChange={manejarCambio}
                        />
                    </div>

                    {/* Placa e IMEI */}
                    <div className="formulario__fila">
                        <div className="formulario__grupo">
                            <label className="formulario__etiqueta" htmlFor="campo-placa">
                                Placa
                            </label>
                            <input
                                className="formulario__campo"
                                id="campo-placa"
                                name="placa"
                                type="text"
                                placeholder="ABC123"
                                autoComplete="off"
                                value={formulario.placa}
                                onChange={manejarCambio}
                            />
                        </div>

                        <div className="formulario__grupo">
                            <label className="formulario__etiqueta" htmlFor="campo-imei">
                                IMEI del GPS (Opcional)
                            </label>
                            <input
                                className="formulario__campo"
                                id="campo-imei"
                                name="imei"
                                type="text"
                                placeholder="Ej: 123456789012345"
                                autoComplete="off"
                                value={formulario.imei}
                                onChange={manejarCambio}
                            />
                        </div>
                    </div>

                    {/* Tipo */}
                    <div className="formulario__grupo">
                        <label className="formulario__etiqueta" htmlFor="campo-tipo">
                            Tipo de Vehículo
                        </label>
                        <select
                            className="formulario__campo formulario__select"
                            id="campo-tipo"
                            name="tipo"
                            value={formulario.tipo}
                            onChange={manejarCambio}
                        >
                            <option value="CARRO">🚗 Carro</option>
                            <option value="MOTO">🏍️ Moto</option>
                        </select>
                    </div>

                    {/* Error */}
                    {error && (
                        <p style={{ color: "#f87171", fontSize: "0.85rem", margin: "0" }}>
                            ⚠️ {error}
                        </p>
                    )}

                    <div className="formulario__pie">
                        <button
                            className="formulario__boton-confirmar"
                            type="button"
                            onClick={manejarConfirmar}
                            disabled={cargando}
                        >
                            {cargando ? "Registrando..." : "Confirmar Registro"}
                        </button>
                        <button className="formulario__boton-cancelar" type="button" onClick={onCerrar}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PanelVehiculo() {
    const [modalVisible, setModalVisible] = useState(false);
    const [vehiculos, setVehiculos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [usuarioId, setUsuarioId] = useState(null);
    const orbePrimarioRef = useRef(null);
    const orbeSecundarioRef = useRef(null);

    const token = localStorage.getItem("token");
    const usuario = localStorage.getItem("usuario");

    const cargarVehiculos = (id) => {
        fetch(`http://localhost:8081/usuario/vehiculos/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setVehiculos(data);
                setCargando(false);
            })
            .catch((error) => {
                console.error("Error cargando vehículos:", error);
                setCargando(false);
            });
    };

    useEffect(() => {
        if (!usuario || !token) return;

        fetch(`http://localhost:8081/usuario/usuario/${usuario}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                setUsuarioId(data.id);
                cargarVehiculos(data.id);
            })
            .catch((error) => {
                console.error("Error obteniendo usuario:", error);
                setCargando(false);
            });
    }, []);

    useEffect(() => {
        const manejarMouse = (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            if (orbePrimarioRef.current)
                orbePrimarioRef.current.style.transform = `translate(${x * 15}px, ${y * 15}px)`;
            if (orbeSecundarioRef.current)
                orbeSecundarioRef.current.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
        };
        document.addEventListener("mousemove", manejarMouse);
        return () => document.removeEventListener("mousemove", manejarMouse);
    }, []);

    return (
        <main className="contenido-principal">
            <div className="contenido-principal__envoltorio">
                <section className="encabezado-dashboard" aria-labelledby="titulo-dashboard">
                    <div className="encabezado-dashboard__info">
                        <span className="encabezado-dashboard__etiqueta">Telemetry Dashboard</span>
                        <h1 className="encabezado-dashboard__titulo" id="titulo-dashboard">
                            Gestión de <span className="encabezado-dashboard__titulo--acento">Unidades</span>
                        </h1>
                        <p className="encabezado-dashboard__descripcion">
                            Supervise y registre dispositivos GPS de alta precisión en su flota.
                            Visualice el estado en tiempo real de cada activo configurado.
                        </p>
                    </div>
                    <div className="encabezado-dashboard__acciones">
                        <button className="encabezado-dashboard__boton-registrar" type="button"
                            onClick={() => setModalVisible(true)} aria-haspopup="dialog">
                            <span className="material-symbols-outlined" aria-hidden="true">add_circle</span>
                            Registrar Nuevo Vehículo
                        </button>
                        <div className="encabezado-dashboard__insignias">
                            <span className="insignia insignia--activo">
                                Activos: {vehiculos.filter(v => v.activo).length}
                            </span>
                            <span className="insignia insignia--mantenimiento">
                                Inactivos: {vehiculos.filter(v => !v.activo).length}
                            </span>
                        </div>
                    </div>
                </section>

                <section aria-label="Lista de vehículos registrados">
                    <div className="lista-vehiculos-configuracion">
                        <div className="lista-vehiculos__cabecera" role="row" aria-hidden="true">
                            <div className="lista-vehiculos__col-imagen">Tipo</div>
                            <div className="lista-vehiculos__col-modelo">Modelo / IMEI</div>
                            <div className="lista-vehiculos__col-tipo">Categoría</div>
                            <div className="lista-vehiculos__col-placa">Placa</div>
                            <div className="lista-vehiculos__col-estado">Estado</div>
                            <div className="lista-vehiculos__col-acciones">Acciones</div>
                        </div>

                        {cargando ? (
                            <p style={{ padding: "1rem", color: "var(--color-texto-secundario)" }}>
                                Cargando vehículos...
                            </p>
                        ) : vehiculos.length === 0 ? (
                            <p style={{ padding: "1rem", color: "var(--color-texto-secundario)" }}>
                                No hay vehículos registrados.
                            </p>
                        ) : (
                            vehiculos.map((v) => (
                                <TarjetaVehiculo key={v.id} vehiculo={v} />
                            ))
                        )}
                    </div>
                </section>
            </div>

            <ModalRegistro
                visible={modalVisible}
                onCerrar={() => setModalVisible(false)}
                onRegistrado={() => cargarVehiculos(usuarioId)}
                usuarioId={usuarioId}
                token={token}
            />

            <div className="telemetria-decorativa" aria-hidden="true">
                <span className="telemetria-decorativa__estado">System Status: Ready</span>
                <div className="telemetria-decorativa__coordenadas">
                    <div className="telemetria-decorativa__punto" />
                    <span className="telemetria-decorativa__texto">42.3601° N, 71.0589° W</span>
                </div>
            </div>
        </main>
    );
}