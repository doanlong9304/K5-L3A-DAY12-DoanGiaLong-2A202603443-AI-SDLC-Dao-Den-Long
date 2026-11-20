---
name: verify
description: Run the full verification for the current phase and regenerate evidence (tests, headless scenarios for nights 1-3, determinism, bot playthroughs, FPS, UI smoke, screenshots). Use before tagging a phase or when asked to prove a requirement works.
---

# Verify + evidence

1. `npm test` — scenarios (Phase 1 regression + Phase 2), CLI/exit codes, determinism, speed. Must be green.
2. `npm run proof` — runs the REAL CLI for every scenario in `tests/scenarios.js` (per night), determinism
   (3 nights × 2 seeds × 2 runs), bot playthroughs, exit codes, full-night speed; writes
   `docs/proof/phase-2/RESULTS.md` and `runs/`. Never edit these outputs by hand.
   (Pass another folder for later phases: `node scripts/proof.js phase-3`.)
3. Browser checks (only if `src/web` or `index.html` changed):
   - `npm run build`, then start `npx vite preview --port 4173 --strictPort` in the background.
   - `npm run fps` → `docs/proof/phase-2/fps.json` (real GPU, viewport forced to 1280x720, needs avg >= 30).
   - `node scripts/ui-smoke.js` → `docs/proof/phase-2/ui-smoke.json` (menu → intro → play, Esc pause freezes timer, settings persist after reload).
   - Screenshots: `msedge --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1280,720 --virtual-time-budget=5000 --screenshot=<abs path> "http://localhost:4173/?night=N&autoplay&seed=3[&lit=K]"`.
     The FPS shown in SwiftShader screenshots is software rendering — not evidence for FPS.
     Look at every image before claiming what it shows.
   - Stop the preview server afterwards.
4. Update `docs/proof/phase-<N>/TRACE.md`: requirement → how verified → evidence → ĐẠT / CHƯA ĐẠT /
   "chưa kiểm chứng". Anything not verified is never written as ĐẠT. List every old test changed
   because of a new rule, with the reason.

Adding a requirement: add a scenario object to `tests/scenarios.js` (with `phase` and optional `night`).
It is picked up by both `npm test` and `npm run proof`.
