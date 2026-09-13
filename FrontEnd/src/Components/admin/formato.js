/**
 * Formateadores del panel.
 *
 * Van en un .js aparte y no junto a los componentes de Comunes.jsx porque
 * mezclar exportaciones de componentes y de funciones en el mismo archivo
 * rompe el fast refresh de Vite (regla react-refresh/only-export-components).
 */

export const numero = (valor) => (valor ?? 0).toLocaleString("es-CO");

export const fecha = (valor) =>
  valor ? new Date(valor).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fechaHora = (valor) =>
  valor ? new Date(valor).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "—";

/** "hace 4 min" — para la vista de flota, donde importa la antigüedad del dato. */
export function haceCuanto(valor) {
  if (!valor) return "sin datos";
  const segundos = Math.floor((Date.now() - new Date(valor).getTime()) / 1000);
  if (segundos < 60) return "hace un momento";
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;
  return `hace ${Math.floor(segundos / 86400)} d`;
}
