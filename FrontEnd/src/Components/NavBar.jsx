import "../Styles/NavBar.css";

function Navbar() {
    return (
        <nav className="barra-navegacion">

            <div className="contenedor-barra">

                <div className="logo">
                    <span className="logo-icono">⌖</span>
                    <span className="logo-texto">ROMP GPS</span>
                </div>

                <div className="enlaces-nav">
                    <a href="#nosotros">Nosotros</a>
                    <a href="#producto">Producto</a>
                    <a href="#pricing">Pricing</a>
                    <a href="#equipo">Equipo</a>
                </div>

                <button className="boton-nav">
                    Área de Clientes
                </button>

            </div>

        </nav>
    )
}

export default Navbar