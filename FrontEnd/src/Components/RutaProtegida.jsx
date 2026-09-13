import { Navigate } from "react-router-dom";
import { haySesionValida, esAdmin, cerrarSesion } from "../Service/sesion";

/**
 * Guarda de rutas.
 *
 * Antes no existía ninguna: navegar directamente a /panel-control o
 * /configuracion sin token renderizaba la interfaz completa y solo fallaban las
 * peticiones, que además nadie manejaba, dejando pantallas a medio pintar.
 *
 * @param {boolean} soloAdmin  la ruta exige rol ADMIN
 * @param {ReactNode} children  contenido a renderizar si se cumple todo
 */
export default function RutaProtegida({ children, soloAdmin = false }) {

    if (!haySesionValida()) {
        // Cubre tanto "sin token" como "token caducado". Se limpia lo que quede
        // para no dejar un rol huérfano que confunda a la siguiente pantalla.
        cerrarSesion();
        return <Navigate to="/login" replace />;
    }

    if (soloAdmin && !esAdmin()) {
        // Sesión válida pero sin permisos: se devuelve a su propio panel en
        // lugar de al login, que sería desconcertante estando autenticado.
        return <Navigate to="/panel-control" replace />;
    }

    return children;
}
