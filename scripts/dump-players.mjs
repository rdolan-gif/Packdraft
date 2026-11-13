// Prints the current player database as JSON (used by export_players.py).
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'pd38-'));
const out = join(dir, 'players.mjs');
try {
  await build({ entryPoints: ['src/data/players.ts'], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
  const { PLAYERS } = await import(pathToFileURL(out).href);
  process.stdout.write(JSON.stringify(PLAYERS));
} finally {
  rmSync(dir, { recursive: true, force: true });
}
