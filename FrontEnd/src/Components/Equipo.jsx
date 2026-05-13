import "../Styles/Equipo.css";

const miembros = [
    {
        nombre: "Luis Sarmiento",
        cargo: "Desarrollador Frontend",
        imagen: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIBvdfij-o_7YRzwsVtv3ywbaySUj_waRSBrh4clp3jJ5_tUQrM7zPfzbuPRB7MIBXUQA_am2E0a6ZV1s-H8ndv4K-Arb9lYBrZ7TZSP3hUhfL_o-zfP_ww2rnZAkJ_rJz_hXJlfvwSkXOqFCGH2rwg1JORc6tLPO7y5_EGcnwFRdq2zU80tVS4mNCX8gKoNd5Lz8PQEccrHddla3OASYKQ0Iz2LMMV9oF5Uq2DPZDXbp_WY1dFIJn9zo8K6ezGhObJRckJkKKPNg"
    },
    {
        nombre: "Holmert Cabarcas",
        cargo: "Ayudante deL Frontend",
        imagen: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZnHPSzv1jPTh_lVkPNIgJr2pbxtZk9SYeqjI8jHYKjspfTi1qFZh1O2Jbqjz_B0RKeRASYise2V79t0nOoLEMBFwQSGw4XEpU2fxtRSA62KKpc7A4dVelebzeHVo0CKqtejSaaBaGNF0B0zC3ThYBLOaMN8VsuKwyDoc-miPdu1cVwj9iWWtNmQJREf1XSpCStAaFj6wW7qjNCUB9106oHLm2zHrzkeF1dJMvA2CrG8K4y-eREBHkzyQamfVDIc5Axs7Wl8StEfM"
    },
    {
        nombre: "Yannior Tapias",
        cargo: "Desarrollador Fullstack",
        imagen: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXH79AgXj61K5PEeZAPUGwTlJbnwV6j5QugYL7H67knpCUMdB3WvMnX2x3KTvcxKFrsMiYOb8uVekn7ZwlXeewRYxDoYydsYzMpY0--7NKKUvY7lAQOys6GnXoT1gdhEoBBHpJM0mHTmAYHYmZ4v8pDK_j90BPZ7V40LB4FnJu5LArzlRCHDtVVgsR6OvYtQaofV0h_ethJsDXB37w5mYwNbrFvvt4hCV5YHzm6JM2K5TuAyQxgl9Ys-bZ_YuGUd4OtWbco0rmZlA"
    },
    {
        nombre: "Jaime Chang",
        cargo: "Desarrollador Backend",
        imagen: "https://lh3.googleusercontent.com/aida-public/AB6AXuB16npMNQEP893qCRHmq6am0w4m0x5CsgEJPNkklzBRQ5ZhCJiLncI2h1MGfXsIj9odc4whP5DfDqFwD4z2sgzGuDpaPQtoHZH47B8D61M4kHTx0X4TWXeiO8Ad-WA31sRoIaoEhAoBsUAuJ7nHj_r5XAu_EdLrlm45AJ8hj4upMgN7RUu1vBxW8K6PGK5e29p8hOETzD7gAuh8mrm5vSwx3JitrVVlZsKSCJZKAjp-fthHmkm4zEkzF2B01qu78tgKWrfWg3Hc8wg"
    }
]

function Equipo() {
    return (
        <section className="seccion-equipo" id="equipo">

            <div className="contenedor-equipo">

                <div className="encabezado-equipo">

                    <div className="encabezado-equipo-izquierda">

                        <span className="etiqueta-seccion">
                            Nuestro Equipo
                        </span>

                        <h2>
                            Mentes detrás del sistema.
                        </h2>

                    </div>

                    <div className="encabezado-equipo-derecha">

                        <p>
                            Un equipo multidisciplinar enfocado en resolver
                            los problemas de logística más complejos.
                        </p>

                    </div>

                </div>

                <div className="cuadricula-equipo">

                    {miembros.map((miembro, index) => (
                        <div className="tarjeta-miembro" key={index}>

                            <img
                                src={miembro.imagen}
                                alt={miembro.nombre}
                            />

                            <div className="superposicion-miembro">

                                <h3>{miembro.nombre}</h3>
                                <span>{miembro.cargo}</span>

                            </div>

                        </div>
                    ))}

                </div>

            </div>

        </section>
    )
}

export default Equipo