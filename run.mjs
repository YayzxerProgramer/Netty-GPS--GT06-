import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Iniciando Servidor TCP y Backend...\n');

// Servidor TCP (puerto 8080)
const servidorTcp = spawn('mvnw.cmd', ['spring-boot:run'], {
  cwd: join(__dirname, 'Servidor-TCP', 'servidor-tpc'),
  shell: true
});

servidorTcp.stdout.on('data', (data) => {
  console.log(`[Servidor TCP] ${data.toString().trim()}`);
});

servidorTcp.stderr.on('data', (data) => {
  console.error(`[Servidor TCP ERROR] ${data.toString().trim()}`);
});

// Backend (puerto 8081)
const backend = spawn('mvnw.cmd', ['spring-boot:run'], {
  cwd: join(__dirname, 'BackEnd'),
  shell: true
});

backend.stdout.on('data', (data) => {
  console.log(`[Backend] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[Backend ERROR] ${data.toString().trim()}`);
});

// Manejar cierre
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servicios...');
  servidorTcp.kill();
  backend.kill();
  process.exit();
});
