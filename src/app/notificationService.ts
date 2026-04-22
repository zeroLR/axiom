// ── UI Notification Service ────────────────────────────────────────────────────
// Non-blocking toast notifications that replace browser alert() calls.
// Toasts are rendered in a fixed-position host element and auto-dismiss.

export type NotifyType = 'success' | 'error' | 'info';

/** Pure data record for a notification — no DOM side-effects. Useful for tests. */
export interface NotifyRecord {
  message: string;
  type: NotifyType;
}

/** Creates a notification record without any DOM side-effects. */
export function buildNotification(
  message: string,
  type: NotifyType = 'info',
): NotifyRecord {
  return { message, type };
}

const CONTAINER_ID = 'notification-host';
const DURATION_DEFAULT_MS = 3000;
const DURATION_ERROR_MS = 5000;
const FADE_OUT_MS = 350;

function getOrCreateContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Displays a toast notification that auto-dismisses.
 * - `error` toasts last 5 s; others last 3 s.
 * - Clicking a toast dismisses it immediately.
 * - Safe to call during tests that mount no DOM (no-ops when body is absent).
 */
export function showNotification(
  message: string,
  type: NotifyType = 'info',
  durationMs?: number,
): void {
  if (typeof document === 'undefined') return;

  const duration =
    durationMs ?? (type === 'error' ? DURATION_ERROR_MS : DURATION_DEFAULT_MS);

  const container = getOrCreateContainer();

  const toast = document.createElement('div');
  toast.className = `notification-toast notification-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger enter animation on the next paint.
  requestAnimationFrame(() => {
    toast.classList.add('notification-visible');
  });

  const dismiss = (): void => {
    toast.classList.remove('notification-visible');
    setTimeout(() => toast.remove(), FADE_OUT_MS);
  };

  const timerId = setTimeout(dismiss, duration);

  // Click-to-dismiss.
  toast.addEventListener(
    'click',
    () => {
      clearTimeout(timerId);
      dismiss();
    },
    { once: true },
  );
}
