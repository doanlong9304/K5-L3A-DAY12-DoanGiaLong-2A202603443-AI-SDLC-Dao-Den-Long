// Ticket-04 local leaderboard rules (pure; shared by the browser and the Node server/CLI).
// Name: 3-12 chars of [A-Za-z0-9_]; Vietnamese letters with diacritics are also accepted (bonus).
// Keep top 10, score desc; equal score -> earlier achieved_at first.
export const MAX_ENTRIES = 10;
const NAME_RE = /^[\p{L}\p{M}0-9_]{3,12}$/u;

export function validName(name) {
  return typeof name === 'string' && NAME_RE.test(name.normalize('NFC'));
}

// ISO 8601 with the local time-zone offset, e.g. 2026-11-20T15:04:05+07:00
export function isoWithOffset(date = new Date()) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`;
}

export function sortEntries(entries) {
  return [...entries].sort((a, b) => (b.score - a.score) || (Date.parse(a.achieved_at) - Date.parse(b.achieved_at)));
}

export function makeEntry({ name, score, nights_won, seed, achieved_at = isoWithOffset() }) {
  if (!validName(name)) throw new Error('name must be 3-12 characters: letters, digits or _');
  if (!Number.isInteger(score) || score < 0) throw new Error('score must be an integer >= 0');
  if (!Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3) throw new Error('nights_won must be 0..3');
  if (!Number.isInteger(seed)) throw new Error('seed must be an integer');
  return { name: name.normalize('NFC'), score, nights_won, achieved_at, seed };
}

export function addEntry(entries, entry) {
  return sortEntries([...entries, entry]).slice(0, MAX_ENTRIES);
}
