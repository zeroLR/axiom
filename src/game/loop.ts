import { FIXED_DT, MAX_FRAME } from "./config";

// Fixed-timestep accumulator (Gaffer-on-Games pattern). The sim always runs at
// FIXED_DT regardless of frame rate; render is called once per rAF with alpha
// for interpolation if needed. Clamp huge deltas so tab-switches don't spiral.

export interface LoopHandle { stop: () => void }

export function startLoop(
  update: (dt: number) => void,
  render: (alpha: number) => void,
): LoopHandle {
  let last = performance.now() / 1000;
  let acc = 0;
  let running = true;

  function frame(nowMs: number): void {
    if (!running) return;
    const t = nowMs / 1000;
    let delta = t - last;
    if (delta > MAX_FRAME) delta = MAX_FRAME;
    last = t;
    acc += delta;
    while (acc >= FIXED_DT) {
      update(FIXED_DT);
      acc -= FIXED_DT;
    }
    render(acc / FIXED_DT);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    stop() { running = false; },
  };
}
