import type { Container } from "pixi.js";

export interface Scene {
  readonly root: Container;
  /** Stable scene identifier exposed on `body.dataset.scene` for chrome theming. */
  readonly id?: string;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  render(alpha: number): void;
}

function syncSceneAttr(scene: Scene | undefined): void {
  if (typeof document === "undefined") return;
  const id = scene?.id;
  if (id) document.body.dataset.scene = id;
  else delete document.body.dataset.scene;
}

export class SceneStack {
  private readonly stack: Scene[] = [];

  push(s: Scene): void {
    this.stack[this.stack.length - 1]?.exit?.();
    this.stack.push(s);
    s.root.visible = true;
    s.enter?.();
    syncSceneAttr(s);
  }

  pop(): void {
    const s = this.stack.pop();
    s?.exit?.();
    if (s) s.root.visible = false;
    const next = this.stack[this.stack.length - 1];
    next?.enter?.();
    syncSceneAttr(next);
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
