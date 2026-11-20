---
name: verify
description: Run the full verification for the current phase and regenerate evidence (tests, headless scenarios, determinism, playthrough, screenshots). Use before tagging a phase or when asked to prove a requirement works.
---

# Verify + evidence

1. `npm test` — unit + scenario + CLI tests. Must be green.
2. `npm run proof` — runs the REAL CLI for every scenario in `tests/scenarios.js`, determinism
   (2 runs, byte compare), bot playthrough (win + loss), exit codes; writes
   `docs/proof/phase-<N>/RESULTS.md` and `runs/`. Never edit these outputs by hand.
3. Screenshots (only if visuals changed): `npm run build`, `npx vite preview --port 4173`, then
   headless Edge/Chrome:
   `msedge --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1280,720 --virtual-time-budget=4000 --screenshot=<abs path> "http://localhost:4173/?seed=5&lit=4"`
   Look at the image before claiming it shows something. Stop the preview server afterwards.
4. Update `docs/proof/phase-<N>/TRACE.md`: requirement → how verified → evidence → PASS / NOT MET.
   Anything not verified is written as "chưa kiểm chứng", never as PASS.

Adding a requirement: add a scenario object (name, req, scenario, inputs, ticks, check) to
`tests/scenarios.js`. It is picked up by both `npm test` and `npm run proof`.
