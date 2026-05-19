import "../Styles/NavBar.css";
import { useNavigate } from "react-router-dom";

function Navbar() {

    const navigate = useNavigate();

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
                <button
                    type="button"
                    className="boton-nav"
                    onClick={() => navigate("/login")}>
                    Area de Clientes
                </button>
            </div>
        </nav>
    )
}

export default Navbar