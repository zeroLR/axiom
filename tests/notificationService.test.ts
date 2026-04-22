import { describe, it, expect } from 'vitest';
import { buildNotification, type NotifyType, type NotifyRecord } from '../src/app/notificationService';

// ── buildNotification ────────────────────────────────────────────────────────
// Tests cover only the pure `buildNotification` factory, which has no DOM
// side-effects and can therefore run in the default Node/Vitest environment.
// The DOM-rendering side (`showNotification`) is integration-tested in the
// browser; see `src/app/notificationService.ts` for details.

describe('buildNotification', () => {
  it('defaults type to "info"', () => {
    const note = buildNotification('hello');
    expect(note.type).toBe('info');
    expect(note.message).toBe('hello');
  });

  it('preserves the provided type "success"', () => {
    const note = buildNotification('all good', 'success');
    expect(note.type).toBe('success');
  });

  it('preserves the provided type "error"', () => {
    const note = buildNotification('something went wrong', 'error');
    expect(note.type).toBe('error');
  });

  it('preserves the provided type "info"', () => {
    const note = buildNotification('heads up', 'info');
    expect(note.type).toBe('info');
  });

  it('preserves an empty message', () => {
    const note = buildNotification('');
    expect(note.message).toBe('');
  });

  it('returns a plain object with exactly {message, type}', () => {
    const note: NotifyRecord = buildNotification('test', 'error');
    expect(Object.keys(note).sort()).toEqual(['message', 'type']);
  });

  it('does not mutate the message string', () => {
    const raw = '  leading space  ';
    const note = buildNotification(raw);
    expect(note.message).toBe(raw);
  });

  it('each call returns a distinct object', () => {
    const a = buildNotification('msg', 'info');
    const b = buildNotification('msg', 'info');
    expect(a).not.toBe(b);
  });

  const types: NotifyType[] = ['success', 'error', 'info'];
  it.each(types)('round-trips type "%s"', (t) => {
    expect(buildNotification('x', t).type).toBe(t);
  });
});
