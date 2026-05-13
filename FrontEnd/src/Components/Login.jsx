import "../Styles/Login.css";

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
                Precisión en <br />
                cada <span>coordenada</span>.
            </h1>

            <p className="info-sesion__descripcion">
                Acceda a su centro de mando de ROMP GPS. Gestione flotas,
                monitoree activos en tiempo real y analice telemetría con
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

function CampoEntrada({ tipo, etiqueta, placeholder, icono, enlaceAyuda }) {
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
                />
            </div>
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

function FormularioSesion() {
    return (
        <form className="formulario-sesion" onSubmit={(e) => e.preventDefault()}>

            <CampoEntrada
                tipo="email"
                etiqueta="Email Corporativo"
                placeholder="usuario@empresa.com"
                icono="@"
            />

            <CampoEntrada
                tipo="password"
                etiqueta="Contraseña"
                placeholder="••••••••"
                icono="•"
                enlaceAyuda={{ texto: "¿Olvidó su clave?", href: "#" }}
            />

            <div className="caja-recordar">
                <input type="checkbox" id="recordar" className="caja-recordar__checkbox" />
                <label htmlFor="recordar" className="caja-recordar__etiqueta">
                    Mantener sesión iniciada por 30 días
                </label>
            </div>

            <BotonSesion>Iniciar Sesión</BotonSesion>
        </form>
    );
}

function TarjetaSesion() {
    return (
        <div className="tarjeta-sesion">
            <div className="ancla-hud">LAT: 40.7128° N | LON: 74.0060° W</div>

            <div className="encabezado-tarjeta">
                <h2>Área de Clientes</h2>
                <p>Ingrese sus credenciales para acceder al terminal.</p>
            </div>

            <FormularioSesion />

            <div className="pie-tarjeta">
                <p>
                    ¿Aún no es cliente?{" "}
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