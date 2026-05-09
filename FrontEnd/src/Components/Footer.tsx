import "../Styles/Footer.css";

function Footer() {
    return (
        <footer className="pie-pagina">

            <div className="contenedor-pie">

                <div className="logo-pie">
                    ROMP GPS
                </div>

                <div className="enlaces-pie">

                    <a href="#">
                        Privacy Policy
                    </a>

                    <a href="#">
                        Terms of Service
                    </a>

                    <a href="#">
                        API Docs
                    </a>

                </div>

                <div className="derechos-pie">
                    © 2024 ROMP GPS. Precision Navigation.
                </div>

            </div>

        </footer>
    )
}

export default Footer