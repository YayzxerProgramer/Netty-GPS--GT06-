import "../Styles/Footer.css";

const ENLACES = [
    { texto: "Política de Privacidad", href: "#" },
    { texto: "Términos de Servicio", href: "#" },
    { texto: "Documentación API", href: "#" },
];

function Footer() {
    return (
        <footer className="pie-pagina">
            <div className="contenedor-pie">

                <div className="logo-pie">ROMP GPS</div>

                <nav className="enlaces-pie" aria-label="Enlaces legales">
                    {ENLACES.map(({ texto, href }) => (
                        <a key={texto} href={href}>{texto}</a>
                    ))}
                </nav>

                <div className="derechos-pie">
                    © {new Date().getFullYear()} ROMP GPS. Navegación de precisión.
                </div>

            </div>
        </footer>
    );
}

export default Footer;