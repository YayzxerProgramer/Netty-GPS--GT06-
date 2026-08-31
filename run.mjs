#!/usr/bin/env node
/**
 * Arranca el proyecto completo en desarrollo.
 *
 * PROBLEMAS DE LA VERSIÓN ANTERIOR:
 *
 *  - Invocaba "mvnw.cmd" directamente, así que solo funcionaba en Windows.
 *  - No arrancaba el FrontEnd ni las bases de datos: había que lanzar
 *    `docker compose up`, este script y `npm run dev` por separado, sin que
 *    nada de eso estuviera documentado.
 *  - Ctrl+C mataba el shell intermedio, no el proceso Java hijo, y dejaba los
 *    puertos ocupados. Reiniciar daba "Port 8081 was already in use".
 *  - El comentario decía que el servidor TCP escuchaba en 8080; escucha en 9000.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";

const esWindows = platform() === "win32";
const wrapperMaven = esWindows ? "mvnw.cmd" : "./mvnw";
const comandoNpm = esWindows ? "npm.cmd" : "npm";

const procesos = [];

const colores = {
  backend: "\x1b[36m",
  tcp: "\x1b[35m",
  frontend: "\x1b[32m",
  sistema: "\x1b[33m",
  reset: "\x1b[0m",
};

function log(etiqueta, mensaje) {
  const color = colores[etiqueta] || colores.sistema;
  console.log(`${color}[${etiqueta}]${colores.reset} ${mensaje}`);
}

/** Comprueba que existan los .env antes de arrancar nada. */
function verificarEntorno() {
  const requeridos = [
    [".env", "credenciales de las bases de datos"],
    ["BackEnd/.env", "secretos del backend"],
    ["Servidor-TCP/servidor-tpc/.env", "clave de ingesta del servidor TCP"],
    ["FrontEnd/.env", "configuración del frontend"],
  ];

  const faltantes = requeridos.filter(([ruta]) => !existsSync(join(process.cwd(), ruta)));

  if (faltantes.length > 0) {
    log("sistema", "Faltan archivos de configuración:\n");
    faltantes.forEach(([ruta, descripcion]) => {
      console.log(`  ${ruta}  (${descripcion})`);
      console.log(`     cp ${ruta}.example ${ruta}\n`);
    });
    console.log("Sin ellos la aplicación no arranca: ningún secreto tiene valor por defecto.\n");
    process.exit(1);
  }
}

function arrancar(etiqueta, comando, argumentos, directorio) {
  const proceso = spawn(comando, argumentos, {
    cwd: join(process.cwd(), directorio),
    // shell solo en Windows, que es donde hace falta para los .cmd. En Linux y
    // macOS se lanza el binario directamente y así la señal llega al proceso
    // real en lugar de a un shell intermedio.
    shell: esWindows,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const emitir = (datos) =>
    datos.toString().split("\n").filter(Boolean).forEach((linea) => log(etiqueta, linea));

  proceso.stdout.on("data", emitir);
  proceso.stderr.on("data", emitir);

  proceso.on("exit", (codigo) => {
    log("sistema", `${etiqueta} terminó con código ${codigo}`);
  });

  procesos.push({ etiqueta, proceso });
  return proceso;
}

function detenerTodo() {
  log("sistema", "Deteniendo servicios...");

  for (const { etiqueta, proceso } of procesos) {
    if (proceso.killed || proceso.exitCode !== null) continue;

    if (esWindows) {
      // taskkill /T mata también los procesos hijos. Sin esto quedaba vivo el
      // java.exe y el puerto seguía ocupado tras cerrar el script.
      spawn("taskkill", ["/pid", String(proceso.pid), "/f", "/t"], { stdio: "ignore" });
    } else {
      proceso.kill("SIGTERM");
    }
    log("sistema", `${etiqueta} detenido`);
  }

  setTimeout(() => process.exit(0), 1500);
}

process.on("SIGINT", detenerTodo);
process.on("SIGTERM", detenerTodo);

// ---------------------------------------------------------------- arranque

verificarEntorno();

log("sistema", "Recuerda tener las bases de datos arriba: docker compose up -d");
log("sistema", "Arrancando servicios...\n");

arrancar("backend", wrapperMaven, ["spring-boot:run"], "BackEnd");
arrancar("tcp", wrapperMaven, ["spring-boot:run"], "Servidor-TCP/servidor-tpc");
arrancar("frontend", comandoNpm, ["run", "dev"], "FrontEnd");

console.log(`
  Aplicación web   http://localhost:5173
  Panel admin      http://localhost:5173/admin
  API              http://localhost:8081
  Documentación    http://localhost:8081/swagger-ui.html
  Dispositivos GPS localhost:9000  (TCP, no navegador)

  Ctrl+C para detener todo.
`);
