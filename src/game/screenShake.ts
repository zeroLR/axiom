// ── Screen shake system ──────────────────────────────────────────────────────
// Provides camera-shake feedback on hits and kills. The shake offset is applied
// to the Pixi container each frame. Exponential decay for smooth falloff.

/** Current shake state. */
interface ShakeState {
  offsetX: number;
  offsetY: number;
  intensity: number;
  timer: number;
  decay: number;
}

const state: ShakeState = { offsetX: 0, offsetY: 0, intensity: 0, timer: 0, decay: 0.85 };

let enabled = true;

/** Enable or disable screen shake globally. */
export function setScreenShakeEnabled(on: boolean): void {
  enabled = on;
  if (!on) {
    state.offsetX = 0;
    state.offsetY = 0;
    state.intensity = 0;
    state.timer = 0;
  }
}

export function isScreenShakeEnabled(): boolean {
  return enabled;
}

/**
 * Trigger a new shake impulse. Stacks with any active shake by taking the max.
 * @param intensity — max pixel offset (e.g. 5 for player-hit, 1.5 for kill)
 * @param duration — seconds before full decay
 */
export function triggerShake(intensity: number, duration: number): void {
  if (!enabled) return;
  if (intensity > state.intensity) {
    state.intensity = intensity;
    state.timer = duration;
    // Compute decay so intensity reaches ~0.01 at end of duration.
    // decay^(steps) = 0.01  → decay = 0.01^(dt/duration) per tick, but we use
    // a fixed multiplier since we tick every FIXED_DT (1/60).
    const steps = duration * 60;
    state.decay = steps > 0 ? Math.pow(0.01, 1 / steps) : 0;
  }
}

/**
 * Advance shake state by dt seconds. Call once per sim tick.
 */
export function tickShake(dt: number): void {
  if (state.intensity <= 0.01) {
    state.offsetX = 0;
    state.offsetY = 0;
    state.intensity = 0;
    return;
  }
  state.timer -= dt;
  if (state.timer <= 0) {
    state.intensity = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    return;
  }
  state.intensity *= state.decay;
  const angle = Math.random() * Math.PI * 2;
  state.offsetX = Math.cos(angle) * state.intensity;
  state.offsetY = Math.sin(angle) * state.intensity;
}

/** Current shake offset to apply to the rendering container. */
export function getShakeOffset(): { x: number; y: number } {
  return { x: state.offsetX, y: state.offsetY };
}
