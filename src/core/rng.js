// Deterministic seeded PRNG (mulberry32). The core MUST use this, never Math.random,
// so that headless output is identical for the same seed / scenario / inputs.
export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Round to 3 decimals as required by the Test Contract output.
export function round3(x) {
  const r = Math.round(x * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}
