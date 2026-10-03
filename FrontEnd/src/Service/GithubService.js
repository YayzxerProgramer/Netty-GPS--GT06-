/**
 * Inicio del flujo OAuth de GitHub.
 *
 * Antes el archivo se llamaba GitgubService.js (con un error de tipeo) y tanto
 * el client id como la URI de retorno estaban escritos a mano, de modo que
 * desplegar fuera de localhost obligaba a editar el código fuente.
 *
 * El client id es público por diseño en OAuth: identifica a la aplicación, no
 * la autentica. Quien autentica es el client secret, que vive solo en el
 * backend.
 */

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "Ov23lifcAXEVo4WKXu28";

/** Se deriva del origen actual: funciona igual en local y en producción. */
const REDIRECT_URI = `${window.location.origin}/auth/callback`;

export function iniciarLoginGithub() {
    const parametros = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: "user:email",
    });

    window.location.href = `https://github.com/login/oauth/authorize?${parametros}`;
}
