// ── Scene UI helpers ─────────────────────────────────────────────────────────
// Thin wrappers around the shared `#overlay` / `#overlay-inner` DOM structure.
// Every Scene that renders into the overlay should use these helpers instead of
// duplicating the same getElementById / innerHTML / classList logic.
//
// Usage pattern (Scene.enter):
//   const { inner, content } = openOverlay();
//   content.appendChild(createOverlayTitle("shop"));
//   content.appendChild(createOverlaySub(`${pts} pts`));
//   const list = createCardList();
//   // ... append items to list
//   content.appendChild(list);
//   inner.appendChild(createBackButton(() => this.cb.onBack()));
//
// Usage pattern (Scene.exit):
//   closeOverlay();
//   // optional: inner.classList.remove("overlay-constrained");

import { iconBack, iconSpan } from '../icons';

// ── Raw DOM helpers ──────────────────────────────────────────────────────────

/** Returns the shared overlay + inner elements.  Returns null when the DOM is
 *  not ready (e.g. in unit tests that don't mount a full page). */
export function getOverlayElements(): {
  overlay: HTMLElement;
  inner: HTMLElement;
} | null {
  const overlay = document.getElementById('overlay');
  const inner = document.getElementById('overlay-inner');
  if (!overlay || !inner) return null;
  return { overlay, inner };
}

// ── Open / close ─────────────────────────────────────────────────────────────

export interface OpenOverlayResult {
  /** The `#overlay` element (use to set `hidden`). */
  overlay: HTMLElement;
  /** The `#overlay-inner` element (use to append sticky elements like back buttons). */
  inner: HTMLElement;
  /** The `div.overlay-scroll` container — append scrollable content here. */
  content: HTMLElement;
}

/**
 * Clears `#overlay-inner`, sets up the standard `div.overlay-scroll` content
 * container, and makes the overlay visible.
 *
 * Pass `constrained: true` to add the `overlay-constrained` class that limits
 * list height (used by Shop and Equipment scenes).
 */
export function openOverlay(opts: { constrained?: boolean } = {}): OpenOverlayResult {
  const els = getOverlayElements();
  if (!els) {
    // Return a detached structure so callers don't need to null-check.
    const inner = document.createElement('div');
    const content = document.createElement('div');
    inner.appendChild(content);
    return { overlay: document.createElement('div'), inner, content };
  }
  const { overlay, inner } = els;

  inner.innerHTML = '';
  if (opts.constrained) inner.classList.add('overlay-constrained');

  const content = document.createElement('div');
  content.className = 'overlay-scroll';
  inner.appendChild(content);

  overlay.hidden = false;
  return { overlay, inner, content };
}

/**
 * Like `openOverlay` but WITHOUT creating a `div.overlay-scroll` wrapper.
 * Use this for scenes that append content directly to `inner` (e.g. EndgameScene).
 * Returns `{ overlay, inner }` — `inner` is the cleared container ready for use.
 */
export function initOverlay(): { overlay: HTMLElement; inner: HTMLElement } {
  const els = getOverlayElements();
  if (!els) {
    const inner = document.createElement('div');
    return { overlay: document.createElement('div'), inner };
  }
  const { overlay, inner } = els;
  inner.innerHTML = '';
  overlay.hidden = false;
  return { overlay, inner };
}

/**
 * Hides the overlay and clears its content.
 * Pass `constrained: true` when the scene used `openOverlay({ constrained: true })`.
 */
export function closeOverlay(opts: { constrained?: boolean } = {}): void {
  const els = getOverlayElements();
  if (!els) return;
  const { overlay, inner } = els;
  if (opts.constrained) inner.classList.remove('overlay-constrained');
  inner.innerHTML = '';
  overlay.hidden = true;
}

// ── Element factories ────────────────────────────────────────────────────────

/** Creates a `div.overlay-title` with the given text. */
export function createOverlayTitle(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'overlay-title';
  el.textContent = text;
  return el;
}

/** Creates a `div.overlay-sub` with the given text (may be overridden by caller). */
export function createOverlaySub(text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'overlay-sub';
  el.textContent = text;
  return el;
}

/** Creates a `div.overlay-body-scroll` wrapper (middle scrollable zone). */
export function createBodyScroll(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'overlay-body-scroll';
  return el;
}

/** Creates an empty `div.card-list` container. */
export function createCardList(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card-list';
  return el;
}

/**
 * Creates a standard `button.big-btn` back button with the back icon.
 * @param onClick  Called when the button is clicked.
 * @param label    Label appended after the icon (default: " back").
 */
export function createBackButton(
  onClick: () => void,
  label = ' back',
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'big-btn';
  btn.style.marginTop = '8px';
  btn.appendChild(iconSpan(iconBack));
  btn.append(label);
  btn.addEventListener('click', onClick);
  return btn;
}
