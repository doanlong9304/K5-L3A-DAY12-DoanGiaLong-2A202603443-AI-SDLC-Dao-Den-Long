// Single source of truth for gameplay numbers. MUST match game.contract.json "tuning"
// (enforced by tests/contract.test.js).
export const TUNING = Object.freeze({
  player_speed: 6, // m/s
  carry_capacity: 5, // motes the player can carry
  lantern_cost: 5, // motes needed to light one lantern
  lantern_count_night1: 5,
  pickup_radius: 1.0, // m, auto pickup
  interact_radius: 2.5, // m, deposit into a lantern
  pulse_cost: 1, // carried motes consumed per pulse
  pulse_radius: 6, // m
  night1_duration_s: 300,
  flames: 3, // player health
  invuln_s: 1.5,
  hit_drop_ratio: 0.5, // floor(carried * ratio) motes lost on hit
  pulse_stun_s: 3,
  pulse_push_m: 4,
  pulse_cooldown_s: 2,
  safe_radius: 4, // m around every lantern (lit or not) that shades cannot enter
  shade_speed: 4, // m/s
  shade_hit_radius: 1.0,
  fall_enabled: false,
  score: Object.freeze({
    per_mote: 10,
    per_lantern: 100,
    per_stun: 20,
    per_second_left: 1,
    per_flame_left: 50,
  }),
});

// World constants that are not part of the contract tuning block.
export const WORLD = Object.freeze({
  island_radius: 35, // player and shades are clamped inside (no falling)
  lantern_ring_radius: 22, // default lantern layout: regular pentagon
  initial_motes: 20,
  max_motes: 20,
  mote_respawn_s: 3,
  mote_clear_radius: 3, // random motes never spawn this close to the player
  initial_shades: 2,
  max_shades: 5,
  shade_spawn_s: 30,
  shade_spawn_min_dist: 15,
  shade_hover_y: 1.0,
  jump_speed: 7, // m/s
  gravity: 20, // m/s^2
  safe_margin: 0.01, // shades are kept at safe_radius + margin
});
