import { useEffect, useRef, useState } from "react";
import "../Styles/PerfilUsuario.css";

const ENLACES_NAV = [
    { icono: "person", etiqueta: "Perfil", activo: true },
];

const ENLACES_PIE_NAV = [
    { icono: "logout", etiqueta: "Cerrar Sesión" },
];

function FondoAtmosferico() {
    const brilloRef1 = useRef(null);
    const brilloRef2 = useRef(null);

    useEffect(() => {
        const moverBrillo = (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;

            if (brilloRef1.current) {
                brilloRef1.current.style.transform = `translate(${x * 18}px, ${y * 18}px)`;
            }

            if (brilloRef2.current) {
                brilloRef2.current.style.transform = `translate(${x * -15}px, ${y * -15}px)`;
            }
        };

        window.addEventListener("mousemove", moverBrillo);

        return () => {
            window.removeEventListener("mousemove", moverBrillo);
        };
    }, []);

    return (
        <div className="fondo-atmosferico" aria-hidden="true">
            <div className="brillo-superior" ref={brilloRef1} />
            <div className="brillo-inferior" ref={brilloRef2} />
        </div>
    );
}

function NavegacionLateral() {
    const [enlaceActivo, setEnlaceActivo] = useState("Perfil");

    return (
        <aside className="navegacion-lateral">
            <div className="bloque-usuario">
                <div className="contenedor-avatar-mini">
                    <span className="material-symbols-outlined">person</span>
                </div>

                <div>
                    <p className="nombre-usuario-mini">ROMP GPS</p>
                    <p className="unidades-usuario">Precision Navigation Core</p>
                </div>
            </div>

            <nav className="menu-lateral">
                {ENLACES_NAV.map(({ icono, etiqueta }) => (
                    <a
                        key={etiqueta}
                        href="#"
                        className={`enlace-lateral ${enlaceActivo === etiqueta ? "enlace-lateral--activo" : ""
                            }`}
                        onClick={(e) => {
                            e.preventDefault();
                            setEnlaceActivo(etiqueta);
                        }}
                    >
                        <span className="material-symbols-outlined">{icono}</span>
                        {etiqueta}
                    </a>
                ))}
            </nav>

            <div className="pie-nav-lateral">
                {ENLACES_PIE_NAV.map(({ icono, etiqueta }) => (
                    <a key={etiqueta} href="#" className="enlace-lateral">
                        <span className="material-symbols-outlined">{icono}</span>
                        {etiqueta}
                    </a>
                ))}
            </div>
        </aside>
    );
}

function TarjetaIdentidad({ usuarioData }) {
    return (
        <div className="tarjeta-identidad panel-vidrio">
            <div className="qr-decorativo" aria-hidden="true">
                <span className="material-symbols-outlined">qr_code_2</span>
            </div>

            <div className="contenedor-avatar-perfil">
                <div className="anillo-avatar">
                    {usuarioData?.imagenUrl ? (
                        <img
                            className="avatar-perfil-user"
                            src={usuarioData.imagenUrl}
                            alt="Foto de perfil"
                        />
                    ) : (
                        <div className="avatar-placeholder">
                            {usuarioData?.usuario?.charAt(0).toUpperCase() || "?"}
                        </div>
                    )}
                </div>

                <button className="boton-camara" aria-label="Cambiar foto">
                    <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                        photo_camera
                    </span>
                </button>
            </div>

            <h3 className="nombre-perfil">
                {usuarioData?.usuario || "Usuario"}
            </h3>

            <p className="rol-perfil">
                {usuarioData?.rol || "USER"}
            </p>

            <div className="datos-identidad">
                <div className="fila-dato">
                    <span className="etiqueta-dato">Estado</span>

                    <span className="insignia-activo">
                        {usuarioData?.activo ? "Activo" : "Inactivo"}
                    </span>
                </div>

                <div className="fila-dato">
                    <span className="etiqueta-dato">Correo</span>

                    <span className="valor-dato">
                        {usuarioData?.correo || "No disponible"}
                    </span>
                </div>
            </div>
        </div>
    );
}

function CampoFormulario({
    etiqueta,
    tipo = "text",
    valor,
    onChange,
    prefijo,
}) {
    const [enfocado, setEnfocado] = useState(false);

    return (
        <div className="grupo-campo-perfil">
            <label className={`etiqueta-campo-perfil ${enfocado ? "etiqueta-campo-perfil--activa" : ""}`}>
                {etiqueta}
            </label>

            <div className="envoltorio-campo">
                {prefijo && (
                    <span className="prefijo-campo">
                        {prefijo}
                    </span>
                )}

                <input
                    className={`campo-perfil ${prefijo ? "campo-perfil--con-prefijo" : ""
                        }`}
                    type={tipo}
                    value={valor}
                    onChange={onChange}
                    onFocus={() => setEnfocado(true)}
                    onBlur={() => setEnfocado(false)}
                />
            </div>
        </div>
    );
}

function ModalGuardar({
    modalGuardar,
    setModalGuardar,
    actualizarUsuario,
}) {
    if (!modalGuardar) return null;

    return (
        <div
            className="modal-overlay"
            onClick={() => setModalGuardar(false)}
        >
            <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-titulo">
                    Confirmar cambios
                </div>

                <p className="modal-desc">
                    ¿Deseas guardar los cambios realizados
                    en tu perfil?
                </p>

                <div className="modal-acciones">
                    <button
                        className="modal-btn-cancelar"
                        onClick={() => setModalGuardar(false)}
                    >
                        Cancelar
                    </button>

                    <button
                        className="modal-btn-guardar"
                        onClick={actualizarUsuario}
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}

function SeccionFormulario({
    usuarioData,
    setUsuarioData,
    tipo,
    setTipo,
    nuevaContrasena,
    setNuevaContrasena,
    setModalGuardar,
}) {


    return (
        <div className="seccion-formulario">
            <div className="panel-vidrio panel-formulario">

                <div className="cuadricula-campos">

                    <CampoFormulario
                        etiqueta="Nombre"
                        valor={usuarioData?.nombre || ""}
                        onChange={(e) =>
                            setUsuarioData((prev) => ({
                                ...prev,
                                nombre: e.target.value,
                            }))
                        }
                    />

                    <CampoFormulario
                        etiqueta="Apellido"
                        valor={usuarioData?.apellido || ""}
                        onChange={(e) =>
                            setUsuarioData((prev) => ({
                                ...prev,
                                apellido: e.target.value,
                            }))
                        }
                    />

                    <CampoFormulario
                        etiqueta="Nombre de Usuario"
                        valor={usuarioData?.usuario || ""}
                        prefijo="@"
                        onChange={(e) =>
                            setUsuarioData((prev) => ({
                                ...prev,
                                usuario: e.target.value,
                            }))
                        }
                    />

                    <CampoFormulario
                        etiqueta="Teléfono"
                        valor={usuarioData?.telefono || ""}
                        onChange={(e) =>
                            setUsuarioData((prev) => ({
                                ...prev,
                                telefono: e.target.value,
                            }))
                        }
                    />

                    <CampoFormulario
                        etiqueta="Correo Electrónico"
                        tipo="email"
                        valor={usuarioData?.correo || ""}
                        onChange={(e) =>
                            setUsuarioData((prev) => ({
                                ...prev,
                                correo: e.target.value,
                            }))
                        }
                    />

                </div>

                <div className="barra-acciones">

                    <button
                        className="boton-contrasena"
                        type="button"
                        onClick={() =>
                            setTipo(
                                tipo === "password"
                                    ? "text"
                                    : "password"
                            )
                        }
                    >
                        <span className="material-symbols-outlined icono-rotable">
                            visibility
                        </span>

                        {tipo === "password"
                            ? "Mostrar"
                            : "Ocultar"}
                    </button>

                    <div className="grupo-botones-accion">
                        <button
                            className="boton-guardar"
                            onClick={() => setModalGuardar(true)}
                        >
                            Guardar Cambios
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}

function ContenidoPrincipal(props) {
    const {
        usuarioData,
        setUsuarioData,
        tipo,
        setTipo,
        nuevaContrasena,
        setNuevaContrasena,
        setModalGuardar,
    } = props;

    return (
        <main className="contenido-principal">
            <div className="contenedor-interior">

                <div className="encabezado-telemetria">
                    <div className="bloque-titulo">
                        <span className="etiqueta-sistema">
                            SYSTEM // USER_PROFILE_CONFIG
                        </span>

                        <h1 className="titulo-pagina">
                            Configuración de Perfil
                        </h1>
                    </div>

                    <div className="bloque-fecha">
                        <p className="etiqueta-fecha">
                            STATUS
                        </p>

                        <p className="valor-fecha">
                            ONLINE
                        </p>
                    </div>
                </div>

                <div className="cuadricula-contenido">
                    <TarjetaIdentidad
                        usuarioData={usuarioData}
                    />

                    <SeccionFormulario
                        usuarioData={usuarioData}
                        setUsuarioData={setUsuarioData}
                        tipo={tipo}
                        setTipo={setTipo}
                        nuevaContrasena={nuevaContrasena}
                        setNuevaContrasena={setNuevaContrasena}
                        setModalGuardar={setModalGuardar}
                    />
                </div>
            </div>
        </main>
    );
}

function PiePagina() {
    return (
        <footer className="pie-pagina">
            <div className="marca-pie">
                <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    location_on
                </span>

                ROMP GPS
            </div>

            <div className="enlaces-pie">
                {[
                    "Privacy Policy",
                    "Terms of Service",
                    "API Docs",
                ].map((item) => (
                    <a
                        key={item}
                        className="enlace-pie"
                        href="#"
                    >
                        {item}
                    </a>
                ))}
            </div>

            <p className="copyright-pie">
                © 2024 ROMP GPS.
            </p>
        </footer>
    );
}

export default function PerfilUsuario() {
    const [usuarioData, setUsuarioData] = useState(null);

    const [tipo, setTipo] = useState("password");

    const [modalGuardar, setModalGuardar] =
        useState(false);

    const [nuevaContrasena, setNuevaContrasena] =
        useState("");

    const token = localStorage.getItem("token");

    const usuario =
        localStorage.getItem("usuario");

    useEffect(() => {
        fetch(
            `http://localhost:8081/usuario/usuario/${usuario}`,
            {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",

                    Authorization: `Bearer ${token}`,
                },
            }
        )
            .then((respuesta) => respuesta.json())

            .then((data) => {
                setUsuarioData(data);
            })

            .catch((error) => {
                console.error(error);
            });
    }, []);

    function actualizarUsuario() {
        const payload = {
            id: usuarioData?.id,
            nombre: usuarioData?.nombre,
            apellido: usuarioData?.apellido,
            usuario: usuarioData?.usuario,
            correo: usuarioData?.correo,
            telefono: usuarioData?.telefono,
            activo: usuarioData?.activo ?? true,
            rol: usuarioData?.rol ?? "USER",
        };

        fetch(
            `http://localhost:8081/usuario/${usuarioData.id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            }
        )
            .then((respuesta) => respuesta.json())

            .then((data) => {
                setUsuarioData(data);

                setModalGuardar(false);
            })

            .catch((error) => {
                console.error(
                    "Error actualizando usuario:",
                    error
                );
            });
    }

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@200;300;400;500;600;700;800&display=swap"
                rel="stylesheet"
            />

            <link
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                rel="stylesheet"
            />

            <div className="pagina-perfil">

                <FondoAtmosferico />

                <div className="cuerpo-pagina">

                    <NavegacionLateral />

                    <ContenidoPrincipal
                        usuarioData={usuarioData}
                        setUsuarioData={setUsuarioData}
                        tipo={tipo}
                        setTipo={setTipo}
                        nuevaContrasena={nuevaContrasena}
                        setNuevaContrasena={
                            setNuevaContrasena
                        }
                        setModalGuardar={
                            setModalGuardar
                        }
                    />
                </div>

                <PiePagina />

                <ModalGuardar
                    modalGuardar={modalGuardar}
                    setModalGuardar={
                        setModalGuardar
                    }
                    actualizarUsuario={
                        actualizarUsuario
                    }
                />
            </div>
        </>
    );
}