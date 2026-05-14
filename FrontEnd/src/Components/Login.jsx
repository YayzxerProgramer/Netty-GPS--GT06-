import "../Styles/Login.css";
import { useState } from "react";


const [usuario, setUsuario] = useState("")
const [contrasena, setContrasena] = useState("")
const auth = {
    usuario : {usuario},
    contrasena : {contrasena}
}

function autenticar(usuario, contrasena) {
    fetch("http://localhost:8081/usuario/login", {
        method: 'POST',
        headers: { 'Content-Type' : 'application/json'},
        body : JSON.stringify(auth)
    }).then((respuesta) => respuesta.json())
        
}

function CajaEstadistica({ valor, etiqueta }) {
    return (
        <div className="caja-estadistica">
            <h3>{valor}</h3>
            <span>{etiqueta}</span>
        </div>
    );
}

function InfoSesion() {
    return (
        <div className="info-sesion">
            <span className="info-sesion__etiqueta">Security Protocol</span>

            <h1>
                Precision en <br />
                cada <span>coordenada</span>.
            </h1>

            <p className="info-sesion__descripcion">
                Acceda a su centro de mando de ROMP GPS. Gestione flotas,
                monitoree activos en tiempo real y analice telemetria con
                exactitud milimétrica.
            </p>

            <div className="estadisticas-sesion">
                <CajaEstadistica valor="12ms" etiqueta="Latencia" />
                <div className="estadisticas-sesion__divisor" />
                <CajaEstadistica valor="99.9%" etiqueta="Uptime" />
            </div>
        </div>
    );
}

function CampoEntrada({ tipo, etiqueta, placeholder, icono, enlaceAyuda, entrada, fun  }) {

    return (
        <div className="grupo-campo">
            {enlaceAyuda ? (
                <div className="grupo-campo__fila">
                    <label className="grupo-campo__etiqueta">{etiqueta}</label>
                    <a href={enlaceAyuda.href} className="grupo-campo__enlace">
                        {enlaceAyuda.texto}
                    </a>
                </div>
            ) : (
                <label className="grupo-campo__etiqueta">{etiqueta}</label>
            )}

            <div className="caja-entrada">
                <span className="caja-entrada__icono">{icono}</span>
                <input
                    type={tipo}
                    placeholder={placeholder}
                    className="caja-entrada__input"
                    value={entrada}
                    onChange={fun}
                />
            </div>
        </div>
    );
}

function FormularioSesion() {
    return (
        <div className="formulario-sesion-wrapper">
            <BotonesSociales />

            <SeparadorOAuth />

            <form className="formulario-sesion" onSubmit={(e) => e.preventDefault()}>
                <CampoEntrada
                    tipo="email"
                    etiqueta="Email Corporativo"
                    placeholder="usuario@empresa.com"
                    icono="@"
                    value={usuario}
                    onChange={(e) => setNombre(e.target.value)}
                />

                <CampoEntrada
                    tipo="password"
                    etiqueta="Contraseña"
                    placeholder="••••••••"
                    icono="•"
                    value={contrasena}
                    enlaceAyuda={{ texto: "¿Olvidó su clave?", href: "#" }}
                    onChange={(e) => setContrasena(e.target.value)}
                />

                <BotonSesion>Iniciar Sesion</BotonSesion>
            </form>
        </div>
    );
}


function BotonSesion({ children }) {
    return (
        <button type="submit" className="boton-sesion">
            {children}
            <span className="boton-sesion__flecha">→</span>
        </button>
    );
}

function IconoGoogle() {
    return (
        <svg className="boton-social__icono" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

function IconoGitHub() {
    return (
        <svg className="boton-social__icono" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
    );
}

function BotonesSociales() {
    return (
        <div className="botones-sociales">
            <button type="button" className="boton-social boton-social--google" onClick={() => { }}>
                <IconoGoogle />
                <span>Google</span>
            </button>
            <button type="button" className="boton-social boton-social--github" onClick={() => { }}>
                <IconoGitHub />
                <span>GitHub</span>
            </button>
        </div>
    );
}

function SeparadorOAuth() {
    return (
        <div className="separador-oauth">
            <span className="separador-oauth__linea" />
            <span className="separador-oauth__texto">O continua con</span>
            <span className="separador-oauth__linea" />
        </div>
    );
}


function TarjetaSesion() {
    return (
        <div className="tarjeta-sesion">
            <div className="ancla-hud">LAT: 40.7128° N | LON: 74.0060° W</div>

            <div className="encabezado-tarjeta">
                <h2>Area de Clientes</h2>
                <p>Ingrese sus credenciales para acceder al terminal.</p>
            </div>

            <FormularioSesion />

            <div className="pie-tarjeta">
                <p>
                    ¿Aun no es cliente?{" "}
                    <a href="#">Solicite un demo</a>
                </p>
            </div>
        </div>
    );
}

const ENLACES_INFERIORES = [
    { texto: "Soporte 24/7", href: "#" },
    { texto: "Seguridad de Datos", href: "#" },
    { texto: "Estado del Sistema", href: "#" },
];

function EnlacesInferiores() {
    return (
        <div className="enlaces-inferiores">
            {ENLACES_INFERIORES.map(({ texto, href }, i) => (
                <span key={texto} className="enlaces-inferiores__grupo">
                    <a href={href} className="enlaces-inferiores__item">{texto}</a>
                    {i < ENLACES_INFERIORES.length - 1 && (
                        <span className="enlaces-inferiores__separador">•</span>
                    )}
                </span>
            ))}
        </div>
    );
}

function SeccionSesion() {
    return (
        <section className="pagina-sesion">
            <div className="circulo-fondo circulo-fondo-1" />
            <div className="circulo-fondo circulo-fondo-2" />

            <div className="contenedor-sesion">
                <InfoSesion />
                <TarjetaSesion />
            </div>

            <EnlacesInferiores />
        </section>
    );
}

function EncabezadoSesion() {
    return (
        <header className="barra-encabezado-sesion">
            <div className="marca-sesion">
                <span className="icono-marca">⌖</span>
                <span className="texto-marca">ROMP GPS</span>
            </div>

            <a href="/" className="enlace-inicio">
                <span className="enlace-inicio__flecha">←</span>
                Volver al Inicio
            </a>
        </header>
    );
}

const ENLACES_PIE = [
    { texto: "Política de Privacidad", href: "#" },
    { texto: "Términos de Servicio", href: "#" },
    { texto: "Docs API", href: "#" },
];

function PiePagina() {
    return (
        <footer className="barra-pie-sesion">
            <div className="marca-pie">ROMP GPS</div>

            <p className="derechos-pie">© 2024 ROMP GPS. Precision Navigation.</p>

            <nav className="navegacion-pie">
                {ENLACES_PIE.map(({ texto, href }) => (
                    <a key={texto} href={href}>{texto}</a>
                ))}
            </nav>
        </footer>
    );
}

export default function LoginPage() {
    return (
        <>
            <EncabezadoSesion />
            <SeccionSesion />
            <PiePagina />
        </>
    );
}