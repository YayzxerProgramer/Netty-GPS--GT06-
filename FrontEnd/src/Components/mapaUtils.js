/**
 * Utilidades compartidas por el mapa del panel de control y sus pestañas
 * (rastreo en vivo, historial y navegación).
 */

/** Estilo de Google Maps en la paleta verde oscura del panel. */
export const ESTILO_MAPA = [
    { elementType: "geometry", stylers: [{ color: "#141912" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f120e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#7d857a" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#a7ada5" }] },
    { featureType: "administrative.neighborhood", elementType: "labels.text.fill", stylers: [{ color: "#6f776c" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#121610" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "on" }, { color: "#172015" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#232a20" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a2018" }] },
    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#2a3326" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#354d2f" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#4a6342" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b0f0a" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a5448" }] },
];

/** Distancia en metros entre dos puntos { lat, lng }. */
export function distancia(a, b) {
    const R = 6371000;
    const r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r;
    const dLng = (b.lng - a.lng) * r;
    const x = Math.sin(dLat / 2) ** 2
        + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
}

/** "850 m" o "3,4 km". */
export function formatearDistancia(metros) {
    if (metros < 1000) return `${Math.max(10, Math.round(metros / 10) * 10)} m`;
    return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Número con un decimal y coma decimal. */
export const decimal = (n) => Number(n).toFixed(1).replace(".", ",");

export function horaMinutos(fecha) {
    return new Date(fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Acepta google.maps.LatLng o un literal y devuelve siempre { lat, lng }. */
export function aLiteral(p) {
    return typeof p.lat === "function" ? { lat: p.lat(), lng: p.lng() } : p;
}

/**
 * Marcador con HTML propio (Google Marker solo admite imágenes, y el diseño
 * necesita animaciones CSS como el pulso de la unidad en vivo).
 * Se dibuja en la capa sin eventos para no bloquear el arrastre del mapa.
 */
export function crearMarcadorHtml(google, { mapa, posicion, html, ancho, alto, anclaX = ancho / 2, anclaY = alto / 2, zIndex = 1 }) {
    class MarcadorHtml extends google.maps.OverlayView {
        constructor() {
            super();
            this.pos = posicion;
            this.div = document.createElement("div");
            Object.assign(this.div.style, {
                position: "absolute",
                width: `${ancho}px`,
                height: `${alto}px`,
                zIndex: String(zIndex),
                transition: "opacity .3s",
            });
            this.div.innerHTML = html;
        }

        onAdd() {
            this.getPanes().overlayLayer.appendChild(this.div);
        }

        draw() {
            const proyeccion = this.getProjection();
            if (!proyeccion || !this.pos) {
                this.div.style.display = "none";
                return;
            }
            const p = proyeccion.fromLatLngToDivPixel(new google.maps.LatLng(this.pos));
            this.div.style.display = "";
            this.div.style.left = `${p.x - anclaX}px`;
            this.div.style.top = `${p.y - anclaY}px`;
        }

        onRemove() {
            this.div.remove();
        }

        setPosition(pos) {
            this.pos = pos;
            this.draw();
        }

        getPosition() {
            return this.pos;
        }

        setOpacity(valor) {
            this.div.style.opacity = String(valor);
        }
    }

    const marcador = new MarcadorHtml();
    marcador.setMap(mapa);
    return marcador;
}

/** HTML de un punto circular (inicio de recorrido, paradas). */
export function htmlPunto(color, tamano) {
    return `<div style="width:${tamano}px;height:${tamano}px;border-radius:50%;background:${color};border:3px solid #0f120e;box-shadow:0 0 0 1.5px ${color}"></div>`;
}

/** HTML de un icono de Material Symbols dentro de un círculo oscuro. */
export function htmlIconoCircular(icono, color, tamano = 36) {
    return `<div style="width:${tamano}px;height:${tamano}px;border-radius:50%;background:#171c16;border:2px solid ${color};display:grid;place-items:center;box-shadow:0 6px 16px rgba(0,0,0,.5)"><span class="material-symbols-outlined" style="font-size:${Math.round(tamano * 0.53)}px;color:${color};font-variation-settings:'FILL' 1">${icono}</span></div>`;
}

/**
 * Ajusta el mapa a unos puntos dejando libre la zona que tapan los paneles
 * (barra lateral a la izquierda en escritorio, hoja inferior en móvil).
 */
export function encuadrar(google, mapa, puntos) {
    if (!mapa || !puntos.length) return;
    const limites = new google.maps.LatLngBounds();
    puntos.forEach((p) => limites.extend(p));
    const angosto = window.innerWidth < 760;
    mapa.fitBounds(limites, angosto
        ? { top: 90, left: 24, right: 24, bottom: Math.round(window.innerHeight * 0.55) }
        : { top: 130, left: 400, right: 90, bottom: 120 });
}
