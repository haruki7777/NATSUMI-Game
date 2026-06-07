import fs from 'fs';
import { chmod, mkdir } from 'fs/promises';
import https from 'https';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const token = String(
  process.env.GAME_CLOUDFLARED_TUNNEL_TOKEN
    || process.env.CLOUDFLARED_TUNNEL_TOKEN
    || process.env.CF_TUNNEL_TOKEN
    || '',
).trim();

let child = null;

function cloudflaredUrl() {
  const platform = os.platform();
  const arch = os.arch();
  if (platform !== 'linux') return null;
  if (arch === 'x64') return 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
  if (arch === 'arm64') return 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64';
  return null;
}

function download(url, target) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'natsumi-game-cloudflared' } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        download(response.headers.location, target).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`cloudflared download failed with HTTP ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(target, { mode: 0o755 });
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(30000, () => request.destroy(new Error('cloudflared download timed out')));
  });
}

async function ensureCloudflared() {
  if (process.env.CLOUDFLARED_BIN) return process.env.CLOUDFLARED_BIN;
  const url = cloudflaredUrl();
  if (!url) return 'cloudflared';

  const binDir = path.join(process.cwd(), '.cloudflared-bin');
  const binPath = path.join(binDir, 'cloudflared');
  if (fs.existsSync(binPath)) return binPath;

  await mkdir(binDir, { recursive: true });
  await download(url, binPath);
  await chmod(binPath, 0o755);
  return binPath;
}

export async function startCloudflaredTunnel() {
  if (!token) return;
  if (child) return;

  try {
    const bin = await ensureCloudflared();
    child = spawn(bin, ['tunnel', '--no-autoupdate', 'run', '--token', token], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.stdout.on('data', (chunk) => {
      const text = String(chunk).replace(token, '[redacted]');
      process.stdout.write(`[cloudflared] ${text}`);
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk).replace(token, '[redacted]');
      process.stderr.write(`[cloudflared] ${text}`);
    });
    child.on('exit', (code) => {
      child = null;
      console.warn(`[cloudflared] tunnel exited with code ${code}`);
    });

    console.log('[cloudflared] game tunnel starting.');
  } catch (error) {
    console.warn(`[cloudflared] game tunnel could not start: ${error?.message || error}`);
  }
}

process.once('SIGTERM', () => child?.kill('SIGTERM'));
process.once('SIGINT', () => child?.kill('SIGINT'));

startCloudflaredTunnel();
