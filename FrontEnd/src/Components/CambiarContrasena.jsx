import { useState, useEffect, useRef } from "react";
import "../Styles/CambiarContrasena.css";
import { useNavigate } from "react-router-dom";

function RadarDecorativo() {
    return (
        <div className="radar-decorativo" aria-hidden="true">
            <svg
                className="radar-decorativo__svg"
                viewBox="0 0 800 800"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="400" cy="400" fill="none" r="350" stroke="currentColor" strokeDasharray="10 10" strokeWidth="0.5" />
                <circle cx="400" cy="400" fill="none" r="250" stroke="currentColor" strokeWidth="0.5" />
                <path d="M50,400 L750,400 M400,50 L400,750" opacity="0.5" stroke="currentColor" strokeWidth="0.5" />
                <g fill="none" stroke="currentColor" strokeWidth="0.2">
                    <circle cx="400" cy="400" r="150" />
                    <circle cx="400" cy="400" r="100" />
                    <circle cx="400" cy="400" r="300" />
                </g>
                <g opacity="0.3" stroke="currentColor" strokeWidth="0.5">
                    <path d="M150,150 L650,650 M150,650 L650,150" />
                </g>
            </svg>
        </div>
    );
}

/* ─────────────────────────────────────────────
   SUBCOMPONENTE: Indicador de Fortaleza
───────────────────────────────────────────── */
function IndicadorFortaleza({ nivel }) {
    const etiquetas = ["", "Débil", "Medio", "Fuerte", "Muy fuerte"];

    return (
        <div className="indicador-fortaleza">
            {[0, 1, 2, 3].map((i) => (
                <div
                    key={i}
                    className={`indicador-fortaleza__barra ${i < nivel
                        ? "indicador-fortaleza__barra--activa"
                        : "indicador-fortaleza__barra--inactiva"
                        }`}
                />
            ))}
            {nivel > 0 && (
                <span className="indicador-fortaleza__etiqueta">{etiquetas[nivel]}</span>
            )}
        </div>
    );
}

function CampoContrasena({ id, etiqueta, valor, onChange, placeholder, mostrarFortaleza, nivelFortaleza }) {
    const [enfocado, setEnfocado] = useState(false);

    return (
        <div className="campo-contrasena">
            <label
                className={`campo-contrasena__etiqueta ${enfocado ? "campo-contrasena__etiqueta--activa" : ""}`}
                htmlFor={id}
            >
                {etiqueta}
            </label>

            <div className="campo-contrasena__envoltorio">
                <input
                    className="campo-contrasena__input"
                    id={id}
                    name={id}
                    type="password"
                    placeholder={placeholder}
                    autoComplete="off"
                    value={valor}
                    onChange={onChange}
                    onFocus={() => setEnfocado(true)}
                    onBlur={() => setEnfocado(false)}
                />
            </div>

            {mostrarFortaleza && valor.length > 0 && (
                <IndicadorFortaleza nivel={nivelFortaleza} />
            )}
        </div>
    );
}


function calcularFortaleza(contrasena) {
    if (!contrasena) return 0;
    let puntos = 0;
    if (contrasena.length >= 8) puntos++;
    if (contrasena.length >= 12) puntos++;
    if (/[A-Z]/.test(contrasena) && /[0-9]/.test(contrasena)) puntos++;
    if (/[^A-Za-z0-9]/.test(contrasena)) puntos++;
    return Math.min(puntos, 4);
}


export default function ConfiguracionSeguridad() {
    const [formulario, setFormulario] = useState({
        nuevaClave: "",
        confirmarClave: "",
    });
    const navigate = useNavigate();
    const [contrasena, setContrasena] = useState("");
    const orbePrimarioRef = useRef(null);
    const orbeSecundarioRef = useRef(null);
    const usuario = localStorage.getItem("usuario");
    const [usuarioData, setUsuarioData] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:8081/usuario/usuario/${usuario}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        })
            .then((res) => res.json())
            .then((data) => setUsuarioData(data))
            .catch((error) => console.error("Error al obtener la contraseña:", error));
    }, []);

    useEffect(() => {
        const manejarMouse = (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            if (orbePrimarioRef.current)
                orbePrimarioRef.current.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
            if (orbeSecundarioRef.current)
                orbeSecundarioRef.current.style.transform = `translate(${x * 40}px, ${y * 40}px)`;
        };
        document.addEventListener("mousemove", manejarMouse);
        return () => document.removeEventListener("mousemove", manejarMouse);
    }, []);

    function actualizarContrasena(nuevaClave) {
        fetch(`http://localhost:8081/usuario/contrasena/${usuarioData.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ nuevaContrasena: nuevaClave }),
        });
    }


    const manejarCambio = (e) =>
        setFormulario((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const manejarEnvio = (e) => {
        e.preventDefault();
        if (formulario.nuevaClave !== formulario.confirmarClave) {
            alert("Las claves no coinciden.");
            return;
        }
        console.log("Clave actualizada");
    };

    const manejarCancelar = () => {
        setFormulario({ nuevaClave: "", confirmarClave: "" });
    };

    const nivelFortaleza = calcularFortaleza(formulario.nuevaClave);

    return (
        <>
            {/* ── Fondo Atmosférico ── */}
            <div className="fondo-decorativo" aria-hidden="true">
                <div className="fondo-decorativo__orbe-primario" ref={orbePrimarioRef} />
                <div className="fondo-decorativo__orbe-secundario" ref={orbeSecundarioRef} />
            </div>

            {/* ── Página principal ── */}
            <main className="pagina-seguridad">
                <div className="pagina-seguridad__envoltorio">
                    <div className="tarjeta-posicionador">

                        {/* Radar de fondo */}
                        <RadarDecorativo />

                        {/* Tarjeta Central */}
                        <div className="tarjeta-seguridad">

                            {/* Decoraciones internas */}
                            <div className="tarjeta-seguridad__icono-decorativo" aria-hidden="true">
                                <span className="material-symbols-outlined">encrypted</span>
                            </div>
                            <div className="tarjeta-seguridad__texto-tecnico" aria-hidden="true">
                                ENCRYPTION_STRENGTH: AES-256<br />
                                SECURE_TUNNEL: ACTIVE<br />
                                AUTH_LATENCY: 12ms
                            </div>

                            {/* Formulario */}
                            <form className="formulario-seguridad" onSubmit={manejarEnvio} noValidate>

                                {/* Encabezado */}
                                <div className="formulario-seguridad__encabezado">
                                    <h2 className="formulario-seguridad__titulo">Update Security Key</h2>
                                    <p className="formulario-seguridad__subtitulo">Authorized Access Only</p>
                                </div>

                                {/* Campos */}
                                <div className="formulario-seguridad__campos">
                                    <CampoContrasena
                                        id="nuevaClave"
                                        etiqueta="New Security Key"
                                        valor={formulario.nuevaClave}
                                        onChange={manejarCambio}
                                        placeholder="Enter new key"
                                        mostrarFortaleza={true}
                                        nivelFortaleza={nivelFortaleza}
                                    />
                                    <CampoContrasena
                                        id="confirmarClave"
                                        etiqueta="Confirm New Security Key"
                                        valor={formulario.confirmarClave}
                                        onChange={manejarCambio}
                                        placeholder="Repeat new key"
                                        mostrarFortaleza={false}
                                        nivelFortaleza={0}
                                    />
                                </div>

                                {/* Acciones */}
                                <div className="formulario-seguridad__acciones">
                                    <button className="boton-actualizar" type="submit" onClick={(e) => {
                                        e.preventDefault();
                                        actualizarContrasena(formulario.nuevaClave);
                                    }}>
                                        Update Security Key
                                    </button>
                                    <button
                                        className="boton-cancelar"
                                        type="button"
                                        onClick={manejarCancelar}
                                    >
                                        Cancel Changes
                                    </button>
                                </div>

                            </form>
                        </div>

                    </div>
                </div>
            </main>
        </>
    );
}
