import "../Styles/NavBar.css";
import { Link } from 'react-router-dom';

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

                <button className="boton-nav" >
                    <Link to="/login">Area de Clientes</Link>
                </button>

            </div>

        </nav>
    )
}

export default Navbar