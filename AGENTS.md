# AGENTS.md — Đảo Đèn Lồng

3D third-person game (Three.js, web) + headless simulation (Node) that must follow the
lab's Test Contract exactly. Correctness and evidence beat graphics.

## Commands
- Install: `npm ci`
- Dev (browser): `npm run dev`
- Build web: `npm run build` (output `dist/`)
- Test: `npm test` (node:test, files in `tests/`)
- Linux path: `docker build -t dao-den-long .` then `docker run --rm dao-den-long`
- Headless: `node src/headless.js ...` (to be created in Phase 1, per Test Contract)

## Architecture rules
- `src/core/` = pure game logic. MUST NOT import `three`, DOM, or anything browser-only.
- `src/web/` = rendering/input only. Reads state from core; never owns game rules.
- Never use `Math.random` or wall-clock time in core. Use `createRng(seed)` from `src/core/rng.js`
  and a fixed step of 1/60 s per tick.
- Round output coordinates with `round3`. Same seed + scenario + inputs => byte-identical JSONL.
- Every numeric tuning value lives in one place and is mirrored in `game.contract.json`.
- Creative extras must be OFF in headless mode and must not change headless output.

## Working rules
- Requirements source of truth: the lab board (Phase tabs). Do not invent requirements;
  if ambiguous, add an assumption to `docs/notes/assumptions.md` and follow it.
- Small commits, one concern each. Run `npm test` before saying a task is done.
- Evidence goes in `docs/proof/phase-N/` and must be reproducible at the phase tag.
  Never hand-edit program output or write tests that always pass.
- Never commit `.env`, API keys or tokens.
