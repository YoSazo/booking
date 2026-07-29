import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(scriptDirectory, '..');
const backendDirectory = path.join(workspaceDirectory, 'guest-lodge-backend');
const bookingDirectory = path.join(workspaceDirectory, 'hotel-booking-app');
const frontdeskDirectory = path.join(backendDirectory, 'frontdesk');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const requestedHotelId = String(process.argv[2] || '').trim();

console.log('Building the current Front Desk source...');
const build = spawnSync(npmCommand, ['run', 'build'], {
  cwd: frontdeskDirectory,
  env: process.env,
  stdio: 'inherit',
});
if (build.status !== 0) {
  console.error('Front Desk build failed. Local services were not started.');
  process.exit(build.status || 1);
}

const localBackendEnvironment = {
  ...process.env,
  NODE_ENV: 'development',
  ENABLE_META_CAPI: 'false',
  ENABLE_FUNNEL_TRACKING: 'false',
  ENABLE_OUTBOUND_EMAIL: 'false',
  ENABLE_GUEST_INSTALL_REMINDERS: 'false',
  ENABLE_BOOKING_APPROVAL_SWEEP: 'false',
  ENABLE_BOOKING_REVIEW_REMINDERS: 'false',
  ENABLE_FRONTDESK_ASSISTANT: 'false',
  ENABLE_SCHEDULED_PUSH_DIGESTS: 'false',
  ENABLE_VERCEL_PROVISIONING: 'false',
  STRIPE_SECRET_KEY: '',
  STRIPE_MARKETEL_SECRET_KEY: '',
  STRIPE_MARKETEL_WEBHOOK_SECRET: '',
};

const children = [];
let shuttingDown = false;

function start(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: 'inherit',
  });
  children.push(child);
  return child;
}

function stopAll(signal = 'SIGTERM') {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

console.log('\nStarting Marketel locally with external side effects disabled.');
console.log('Funnel:       http://localhost:3001/landing');
console.log('Front Desk:   http://localhost:3001/frontdesk');
if (requestedHotelId) {
  console.log(`Guest page:   http://localhost:5173/?hotelId=${encodeURIComponent(requestedHotelId)}`);
  console.log(`Property desk: http://localhost:3001/frontdesk?hotelId=${encodeURIComponent(requestedHotelId)}`);
} else {
  console.log('Guest page:   http://localhost:5173/?hotelId=YOUR_HOTEL_ID');
  console.log('Tip: npm run dev:local -- hotel-xxxxxxxx');
}
console.log('Stop both services with Ctrl+C.\n');

const backend = start(process.execPath, ['server.js'], {
  cwd: backendDirectory,
  env: localBackendEnvironment,
});
const booking = start(npmCommand, ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173', '--strictPort'], {
  cwd: bookingDirectory,
  env: process.env,
});

for (const [label, child] of [['Backend', backend], ['Booking frontend', booking]]) {
  child.on('error', (error) => {
    console.error(`${label} could not start: ${error.message}`);
    stopAll();
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`${label} stopped${signal ? ` from ${signal}` : ` with code ${code}`}.`);
    stopAll();
    process.exitCode = code || 1;
  });
}

process.on('SIGINT', () => {
  stopAll('SIGINT');
  setTimeout(() => process.exit(0), 100).unref();
});
process.on('SIGTERM', () => {
  stopAll('SIGTERM');
  setTimeout(() => process.exit(0), 100).unref();
});
