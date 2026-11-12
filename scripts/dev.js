const { spawn } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  label: (label, msg) => console.log(`${colors.bright}${colors.magenta}[${label}]${colors.reset} ${msg}`)
};

const rootDir = path.join(__dirname, '..');
const webDir = path.join(rootDir, 'packages/bruno-app');
const electronDir = path.join(rootDir, 'packages/bruno-electron');

let electronProcess = null;
let detectedPort = null;
let electronStarted = false;

// Regex to match rsbuild's local URL output (e.g., "➜ Local:    http://localhost:3000/").
// Rsbuild wraps the label and URL in ANSI colors, so strip those before matching.
const portRegex = /Local:\s+http:\/\/localhost:(\d+)/;
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
let outputBuffer = '';

console.log(`\n${colors.bright}${colors.yellow}🚀 Starting Bruno development environment...${colors.reset}\n`);

// Start the rsbuild dev server
const webProcess = spawn('npm', ['run', 'dev'], {
  cwd: webDir,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

const onWebOutput = (chunk, stream) => {
  const output = chunk.toString();
  stream.write(output);
  if (electronStarted) return;

  outputBuffer = `${outputBuffer}${stripAnsi(output)}`.slice(-500);
  if (!detectedPort) {
    const match = outputBuffer.match(portRegex);
    if (match) {
      detectedPort = match[1];
      log.success(`Detected dev server on port ${colors.bright}${detectedPort}${colors.reset}`);
    }
  }

  // Rsbuild prints the URL before the bundle exists. Opening Electron then
  // leaves a blank window until "built in …" shows up.
  if (detectedPort && /built in /.test(outputBuffer)) {
    electronStarted = true;
    startElectron(detectedPort);
  }
};

webProcess.stdout.on('data', (data) => onWebOutput(data, process.stdout));
webProcess.stderr.on('data', (data) => onWebOutput(data, process.stderr));

webProcess.on('close', (code) => {
  log.info(`Web process exited with code ${code}`);
  cleanup();
});

function startElectron(port) {
  log.info(`Starting Electron with ${colors.cyan}BRUNO_DEV_PORT=${port}${colors.reset}`);

  electronProcess = spawn('npm', ['run', 'dev'], {
    cwd: electronDir,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      BRUNO_DEV_PORT: port
    }
  });

  electronProcess.on('close', (code) => {
    log.info(`Electron process exited with code ${code}`);
    cleanup();
  });
}

function cleanup() {
  if (webProcess && !webProcess.killed) {
    webProcess.kill();
  }
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
