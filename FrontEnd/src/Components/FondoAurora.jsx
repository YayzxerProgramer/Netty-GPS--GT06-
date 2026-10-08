import "../Styles/Aurora.css";

/** Fondo animado común a las vistas internas. Va detrás de todo (z-index 0). */
export default function FondoAurora() {
  return (
    <div className="romp-aurora" aria-hidden="true">
      <div className="romp-aurora__mancha romp-aurora__mancha--1" />
      <div className="romp-aurora__mancha romp-aurora__mancha--2" />
      <div className="romp-aurora__mancha romp-aurora__mancha--3" />
      <div className="romp-aurora__mancha romp-aurora__mancha--4" />
      <div className="romp-aurora__rejilla" />
      <div className="romp-aurora__vineta" />
    </div>
  );
}
