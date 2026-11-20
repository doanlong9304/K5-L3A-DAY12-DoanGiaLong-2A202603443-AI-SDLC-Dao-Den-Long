#!/usr/bin/env node
// run_cmd (Contract v1.3): `npm start` = node scripts/play.js
//   (no args)                          start the game server and open it in the default browser
//   --export-leaderboard out.json      write {"entries": [...]} (sorted, top 10) and exit
//   --no-open                          start the server without opening a browser
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { loadEntries } from './leaderboard-store.js';

const argv = process.argv.slice(2);
const exp = argv.indexOf('--export-leaderboard');
if (exp >= 0) {
  const out = argv[exp + 1];
  if (!out) { process.stderr.write('error: --export-leaderboard needs an output file\n'); process.exit(1); }
  writeFileSync(out, JSON.stringify({ entries: loadEntries() }, null, 2) + '\n');
  console.log(`exported ${loadEntries().length} entries to ${out}`);
  process.exit(0);
}

const { createServer } = await import('vite');
const server = await createServer({ server: { port: 5173 } });
await server.listen();
const url = server.resolvedUrls.local[0];
console.log(`Đảo Đèn Lồng đang chạy tại ${url}  (Ctrl+C để thoát)`);
if (!argv.includes('--no-open')) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}
