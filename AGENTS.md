# AGENTS.md — Đảo Đèn Lồng

3D third-person game (Three.js, web) + headless simulation (Node) that must follow the
lab's Test Contract (currently **v1.3**: + bench_cmd, soak_cmd) exactly. Correctness and evidence beat graphics.

## Commands
- Install: `npm ci` · Dev: `npm run dev` · Build: `npm run build`
- Test: `npm test` (node:test, `tests/`) · Evidence: `npm run proof` (writes `docs/proof/phase-4/`) · Both: `npm run verify`
- Headless: `node src/headless.js --seed 1 --night <1|2|3> --ticks 600 --out out.jsonl [--scenario f] [--inputs f]`
- With `npx vite preview --port 4173` running: `npm run fps` (real-GPU FPS at 1280x720), `node scripts/ui-smoke.js` (menu/pause/settings via CDP)
- Bench: `npm run bench` (opens a 1280x720 Chrome/Edge window, writes bench.json) · Soak: `npm run soak` · Play: `npm start` (= run_cmd `node scripts/play.js`, also `--export-leaderboard out.json`)
- Linux path: `docker build -t dao-den-long .` then `docker run --rm dao-den-long`
- Skill: `.claude/skills/verify`. Stop hook (`.claude/settings.json`) blocks finishing while `npm test` is red.

## Architecture rules
- `src/core/` = pure logic. MUST NOT import `three`, DOM, or anything browser-only.
  `tuning.js` (standard numbers: `TUNING` = contract tuning, `RULES` = other standard rules),
  `maps.js` (standard maps + ground height function), `game.js` (`step()` = the mandatory 12-step tick order, keep the numbered comments in that order).
- `src/web/` = rendering/input/audio/screens only; never owns game rules.
- Never use `Math.random` or wall-clock time in core. Use `game.rng` and fixed 1/60 s ticks.
- Round output with `round3`. Same seed + scenario + inputs => byte-identical JSONL.
- Numbers come ONLY from `tuning.js`; `game.contract.json` tuning must equal `TUNING` (test enforces).
- Creative extras live in `src/web/` only, must not change headless output, and are OFF in the bench scene (`?bench`).
- Bench scene lives in core (`createGame({ bench: true })`); keep its spec (200 shades, 100 motes, L1-L3 fuel 100, no spawn/damage/pickup/decay/end).

## Working rules
- Requirements source of truth: lab board ticket text (paste it; the board is not machine-readable).
  Do not invent requirements; if ambiguous, add a row to `docs/notes/assumptions.md` and follow it.
- New requirement => add a scenario object to `tests/scenarios.js` FIRST (phase, name, req, scenario, inputs, ticks, check).
- Before changing an old test, ask: did the ticket change this rule? If yes, update/delete it and list it in CHANGELOG.md + the phase TRACE.md. Never skip silently.
- Lantern fuel is an integer count of 1/60 units in core (`FUEL_MAX = 6000`); convert only in snapshot/events. Design rationale: `docs/adr/`.
- When a test fails, decide test-bug vs code-bug from the tick order before "fixing" either (pickup runs before interact; movement before contact).
- Small commits, one concern each. Commit messages: no AI co-author trailer (user preference).
- Evidence goes in `docs/proof/phase-N/` and must be reproducible at the phase tag. Never hand-edit program output, never write tests that always pass. Look at screenshots before claiming what they show.
- Never commit `.env`, API keys or tokens.
