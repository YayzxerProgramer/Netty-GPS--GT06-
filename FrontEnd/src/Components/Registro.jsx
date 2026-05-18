import "../Styles/Registro.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";

/* ─── Campo de entrada ──────────────────────────────── */
function CampoEntrada({ tipo = "text", etiqueta, placeholder, valor, onChange }) {
    return (
        <div className="reg-grupo-campo">
            <label className="reg-etiqueta">{etiqueta}</label>
            <div className="reg-caja-entrada">
                <input
                    type={tipo}
                    placeholder={placeholder}
                    className="reg-input"
                    value={valor}
                    onChange={onChange}
                />
            </div>
        </div>
    );
}

/* ─── Checkbox términos ─────────────────────────────── */
function CheckboxTerminos({ checked, onChange }) {
    return (
        <label className="reg-terminos">
            <div
                className={`reg-checkbox ${checked ? "reg-checkbox--checked" : ""}`}
                onClick={onChange}
            >
                {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </div>
            <span>
                Acepto los términos de servicio y protocolos de seguridad de la red ROMP.
            </span>
        </label>
    );
}

/* ─── Separador ─────────────────────────────────────── */
function Separador() {
    return (
        <div className="reg-separador">
            <span className="reg-separador__linea" />
            <span className="reg-separador__texto">O continua con</span>
            <span className="reg-separador__linea" />
        </div>
    );
}

/* ─── Botón Google ──────────────────────────────────── */
function BotonGoogle({ onClick, cargando }) {
    return (
        <button
            type="button"
            className="reg-boton-google"
            onClick={onClick}
            disabled={cargando}
        >
            <svg className="reg-boton-google__icono" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09" />
                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23" />
                <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z" />
                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53" />
            </svg>
            <span>{cargando ? "Conectando con Google..." : "Continuar con Google"}</span>
        </button>
    );
}

/* ─── Formulario principal ──────────────────────────── */
function FormularioRegistro() {
    const navigate = useNavigate();

    const [usuario, setUsuario]               = useState("");
    const [correo, setCorreo]                 = useState("");
    const [contrasena, setContrasena]         = useState("");
    const [confirmar, setConfirmar]           = useState("");
    const [terminos, setTerminos]             = useState(false);
    const [error, setError]                   = useState("");
    const [cargando, setCargando]             = useState(false);
    const [cargandoGoogle, setCargandoGoogle] = useState(false);

    /* ── Validación ── */
    function validar() {
        if (!usuario || !correo || !contrasena || !confirmar) {
            setError("Complete todos los campos.");
            return false;
        }
        if (contrasena !== confirmar) {
            setError("Las contraseñas no coinciden.");
            return false;
        }
        if (!terminos) {
            setError("Debe aceptar los términos de servicio.");
            return false;
        }
        return true;
    }

    /* ── Submit manual ── */
    function handleSubmit(e) {
        e.preventDefault();
        if (!validar()) return;

        setCargando(true);
        setError("");

        const payload = { usuario, correo, contrasena, rol: "USER", activo: true };

        fetch("http://localhost:8081/usuario", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
            .then((res) => {
                if (!res.ok) return res.json().then((d) => { throw new Error(d.error || "Error al crear cuenta"); });
                return res.json();
            })
            .then(() => navigate("/login"))
            .catch((err) => setError(err.message))
            .finally(() => setCargando(false));
    }

    /* ── Google OAuth ── */
    const loginConGoogle = useGoogleLogin({
        onSuccess: async (respuestaGoogle) => {
            setCargandoGoogle(true);
            setError("");
            try {
                // 1. Obtener perfil verificado desde Google
                const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${respuestaGoogle.access_token}` },
                });

                if (!infoRes.ok) throw new Error("No se pudo obtener información de Google");

                const infoGoogle = await infoRes.json();

                // 2. Mandar al backend → crea o busca usuario → devuelve JWT
                const backendRes = await fetch("http://localhost:8081/usuario/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tokenGoogle: respuestaGoogle.access_token,
                        correo:      infoGoogle.email,
                        nombre:      infoGoogle.name,
                        imagenUrl:   infoGoogle.picture,
                        sub:         infoGoogle.sub,
                    }),
                });

                if (!backendRes.ok) {
                    const data = await backendRes.json();
                    throw new Error(data.error || "Error al autenticar con Google");
                }

                const data = await backendRes.json();
                localStorage.setItem("token",   data.token);
                localStorage.setItem("usuario", data.usuario);
                navigate("/panel-control");

            } catch (err) {
                setError(err.message);
            } finally {
                setCargandoGoogle(false);
            }
        },
        onError: () => setError("Error al conectar con Google. Intente nuevamente."),
    });

    return (
        <form className="reg-formulario" onSubmit={handleSubmit}>

            {/* Coordenadas HUD */}
            <div className="reg-ancla-hud">
                LAT: 40.7128° N<br />
                LON: 74.0060° W
            </div>

            {/* ── Botón Google arriba del formulario ── */}
            <BotonGoogle onClick={() => loginConGoogle()} cargando={cargandoGoogle} />

            {/* Separador */}
            <Separador />

            {/* Usuario */}
            <div className="reg-fila-1">
                <CampoEntrada
                    etiqueta="NOMBRE DE USUARIO"
                    placeholder="Ej: alex_mercer"
                    valor={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                />
            </div>

            {/* Contraseñas */}
            <div className="reg-fila">
                <CampoEntrada
                    tipo="password"
                    etiqueta="CONTRASEÑA"
                    placeholder="••••••••"
                    valor={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                />
                <CampoEntrada
                    tipo="password"
                    etiqueta="CONFIRMAR CONTRASEÑA"
                    placeholder="••••••••"
                    valor={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                />
            </div>

            {/* Email */}
            <div className="reg-fila-1">
                <CampoEntrada
                    tipo="email"
                    etiqueta="EMAIL CORPORATIVO"
                    placeholder="alex@empresa.com"
                    valor={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                />
            </div>

            {/* Términos */}
            <CheckboxTerminos checked={terminos} onChange={() => setTerminos(!terminos)} />

            {/* Error */}
            {error && <p className="reg-error">{error}</p>}

            {/* Botón submit */}
            <button type="submit" className="reg-boton" disabled={cargando}>
                <span>{cargando ? "Creando cuenta..." : "Crear Cuenta"}</span>
                {!cargando && <span className="reg-boton__flecha">→</span>}
            </button>

            {/* Enlace login */}
            <p className="reg-pie-form">
                ¿Ya tiene una cuenta?{" "}
                <a href="/login" className="reg-enlace">Inicie sesión aquí</a>
            </p>

        </form>
    );
}

/* ─── Badges seguridad ──────────────────────────────── */
function BadgesSeguridad() {
    return (
        <div className="reg-badges">
            <span className="reg-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                AES-256 ENCRYPTED
            </span>
            <span className="reg-badge-sep">|</span>
            <span className="reg-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                SSL SECURE LINK
            </span>
        </div>
    );
}

/* ─── Header ────────────────────────────────────────── */
function EncabezadoRegistro() {
    return (
        <header className="reg-barra-encabezado">
            <div className="reg-marca">
                <span className="reg-icono-marca">⌖</span>
                <span className="reg-texto-marca">ROMP GPS</span>
            </div>
            <div className="reg-version">
                <span>ROMP PRECISION TELEMETRY v4.2</span>
                <span className="reg-globo-icono">🌐</span>
            </div>
        </header>
    );
}

/* ─── Footer ────────────────────────────────────────── */
function PieRegistro() {
    return (
        <footer className="reg-pie">
            <div className="reg-pie-izq">
                <div className="reg-pie-marca">ROMP GPS</div>
                <p className="reg-pie-copy">© 2024 ROMP GPS. Precision Telemetry Systems.</p>
            </div>
            <nav className="reg-pie-nav">
                {["Privacy Policy", "Terms of Service", "Security", "Contact Support"].map((t) => (
                    <a key={t} href="#">{t}</a>
                ))}
            </nav>
        </footer>
    );
}

/* ─── Textos decorativos laterales ─────────────────── */
function TextoLateral({ lado }) {
    const texto = "ROMP_TELEMETRY_ENCRYPTED · PRECISION_NAVIGATION · ";
    return (
        <div className={`reg-texto-lateral reg-texto-lateral--${lado}`}>
            {texto.repeat(4)}
        </div>
    );
}

/* ─── Página completa ───────────────────────────────── */
export default function RegisterPage() {
    return (
        <>
            <EncabezadoRegistro />

            <section className="reg-pagina">
                <div className="reg-circulo reg-circulo-1" />
                <div className="reg-circulo reg-circulo-2" />

                <TextoLateral lado="izq" />
                <TextoLateral lado="der" />

                <div className="reg-contenedor">
                    <div className="reg-info">
                        <h1 className="reg-titulo">
                            Crear Nueva <span className="reg-titulo--acento">Cuenta</span>
                        </h1>
                        <p className="reg-descripcion">
                            Únase a la red de telemetría de precisión de ROMP GPS.
                        </p>
                    </div>

                    <div className="reg-tarjeta">
                        <FormularioRegistro />
                    </div>
                </div>

                <BadgesSeguridad />
            </section>

            <PieRegistro />
        </>
    );
}
