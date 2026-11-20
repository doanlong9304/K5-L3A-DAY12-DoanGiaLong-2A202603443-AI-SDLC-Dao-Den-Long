// Claude Code Stop hook: refuse to finish while `npm test` is red.
// Exit 2 = block stopping and feed stderr back to the agent. If the agent was already
// blocked once (stop_hook_active), let it stop but leave a loud warning to avoid loops.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let payload = {};
try { payload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no stdin */ }

const r = spawnSync('npm', ['test', '--silent'], { encoding: 'utf8', shell: true });
if (r.status === 0) process.exit(0);

const tail = (r.stdout + r.stderr).split('\n').filter((l) => /✖|not ok|Error|expected|actual/.test(l)).slice(0, 15).join('\n');
if (payload.stop_hook_active) {
  process.stderr.write(`WARNING: npm test still failing; do not report this task as done.\n${tail}\n`);
  process.exit(0);
}
process.stderr.write(`npm test is failing. Fix it (or explain why) before finishing:\n${tail}\n`);
process.exit(2);
