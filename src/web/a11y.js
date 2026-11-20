// Ticket-04 accessibility helpers: key remapping (conflict detection, defaults, persisted).
export const ACTIONS = [
  ['up', 'Đi lên'], ['down', 'Đi xuống'], ['left', 'Sang trái'], ['right', 'Sang phải'],
  ['jump', 'Nhảy'], ['dash', 'Lướt'], ['interact', 'Tương tác (nạp / châm dầu)'], ['pulse', 'Tỏa sáng'], ['pause', 'Tạm dừng'],
];
// [primary (remappable), fixed alternates]
export const DEFAULT_KEYS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'Escape',
};
export const ALTERNATES = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], pause: ['KeyP'], dash: ['ShiftRight'] };

export function keyLabel(code) {
  if (!code) return '—';
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift trái').replace('ShiftRight', 'Shift phải')
    .replace('Space', 'Space').replace('Escape', 'Esc').replace('Arrow', 'Mũi tên ');
}

/** Returns the action already using `code` (primary or alternate), or null. */
export function conflictOf(bindings, action, code) {
  for (const [a] of ACTIONS) {
    if (a === action) continue;
    if (bindings[a] === code || (ALTERNATES[a] || []).includes(code)) return a;
  }
  return null;
}

export function isDown(keys, bindings, action) {
  return keys.has(bindings[action]) || (ALTERNATES[action] || []).some((c) => keys.has(c));
}
