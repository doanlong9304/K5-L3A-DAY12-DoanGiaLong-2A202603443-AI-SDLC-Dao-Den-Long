// Disk storage for the local leaderboard (data/leaderboard.json) + a Vite plugin exposing it to the game:
//   GET  /api/leaderboard  -> { entries: [...] }   (sorted, top 10)
//   POST /api/leaderboard  { name, score, nights_won, seed } -> { entries, rank }
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addEntry, makeEntry, sortEntries } from '../src/core/leaderboard.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const LEADERBOARD_FILE = process.env.LEADERBOARD_FILE || resolve(ROOT, 'data', 'leaderboard.json');

export function loadEntries(file = LEADERBOARD_FILE) {
  try { return sortEntries(JSON.parse(readFileSync(file, 'utf8')).entries || []); } catch { return []; }
}
export function saveEntries(entries, file = LEADERBOARD_FILE) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ entries }, null, 2) + '\n');
}

function handler(req, res, next) {
  if (!req.url.startsWith('/api/leaderboard')) return next();
  const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  if (req.method === 'GET') return send(200, { entries: loadEntries() });
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const entry = makeEntry(JSON.parse(body));
        const entries = addEntry(loadEntries(), entry);
        saveEntries(entries);
        send(200, { entries, rank: entries.indexOf(entries.find((e) => e === entry || (e.achieved_at === entry.achieved_at && e.name === entry.name))) + 1 });
      } catch (e) { send(400, { error: e.message }); }
    });
    return undefined;
  }
  return send(405, { error: 'method not allowed' });
}

export function leaderboardPlugin() {
  return {
    name: 'dao-den-long-leaderboard',
    configureServer(server) { server.middlewares.use(handler); },
    configurePreviewServer(server) { server.middlewares.use(handler); },
  };
}
