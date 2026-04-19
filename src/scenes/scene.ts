import type { Container } from "pixi.js";

export interface Scene {
  readonly root: Container;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  render(alpha: number): void;
}

export class SceneStack {
  private readonly stack: Scene[] = [];

  push(s: Scene): void {
    this.stack[this.stack.length - 1]?.exit?.();
    this.stack.push(s);
    s.root.visible = true;
    s.enter?.();
  }

  pop(): void {
    const s = this.stack.pop();
    s?.exit?.();
    if (s) s.root.visible = false;
    this.stack[this.stack.length - 1]?.enter?.();
  }

  top(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  update(dt: number): void {
    this.top()?.update(dt);
  }

  // Render every scene bottom-up so overlay scenes (draft/endgame) compose on
  // top of the frozen play-field instead of replacing it.
  render(alpha: number): void {
    for (const s of this.stack) s.render(alpha);
  }
}
