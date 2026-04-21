import { Container } from 'pixi.js';
import type { Scene } from './scene';
import { isMuted, setMuted } from '../game/audio';
import {
  isScreenShakeEnabled,
  setScreenShakeEnabled,
} from '../game/screenShake';
import { initOverlay, closeOverlay, createOverlayTitle, createBackButton } from './ui';

// ── Settings scene (DOM overlay) ────────────────────────────────────────────

export interface SettingsCallbacks {
  onBack: () => void;
  onChanged: () => void;
  getMasterVolume: () => number;
  getSfxVolume: () => number;
  getMusicVolume: () => number;
  setVolumes: (master: number, sfx: number, music: number) => void;
}

export class SettingsScene implements Scene {
  readonly root: Container;
  private readonly cb: SettingsCallbacks;

  constructor(cb: SettingsCallbacks) {
    this.root = new Container();
    this.cb = cb;
  }

  enter(): void {
    const { inner } = initOverlay();

    inner.appendChild(createOverlayTitle('Settings'));

    // ── Sound toggle ────────────────────────────────────────────────────────
    const soundRow = this.createToggleRow('Sound effects', !isMuted(), (on) => {
      setMuted(!on);
      this.cb.onChanged();
    });
    inner.appendChild(soundRow);

    // ── BGM volume slider ───────────────────────────────────────────────────
    const bgmRow = this.createSliderRow(
      'BGM volume',
      this.cb.getMusicVolume(),
      (val) => {
        this.cb.setVolumes(
          this.cb.getMasterVolume(),
          this.cb.getSfxVolume(),
          val,
        );
        this.cb.onChanged();
      },
    );
    inner.appendChild(bgmRow);

    // ── SFX volume slider ───────────────────────────────────────────────────
    const sfxRow = this.createSliderRow(
      'SFX volume',
      this.cb.getSfxVolume(),
      (val) => {
        this.cb.setVolumes(
          this.cb.getMasterVolume(),
          val,
          this.cb.getMusicVolume(),
        );
        this.cb.onChanged();
      },
    );
    inner.appendChild(sfxRow);

    // ── Screen shake toggle ─────────────────────────────────────────────────
    const shakeRow = this.createToggleRow(
      'Screen shake',
      isScreenShakeEnabled(),
      (on) => {
        setScreenShakeEnabled(on);
        this.cb.onChanged();
      },
    );
    inner.appendChild(shakeRow);

    // ── Back button ─────────────────────────────────────────────────────────
    inner.appendChild(createBackButton(() => this.cb.onBack()));
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}

  private createToggleRow(
    label: string,
    initial: boolean,
    onChange: (on: boolean) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'developer-form-row';
    row.style.padding = '10px 0';
    row.style.borderBottom = '1px solid var(--chrome)';

    const labelEl = document.createElement('span');
    labelEl.className = 'developer-form-label';
    labelEl.style.fontSize = '14px';
    labelEl.textContent = label;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'secondary-btn';
    toggle.style.flex = '0 0 auto';
    toggle.style.minWidth = '72px';

    const update = (on: boolean): void => {
      toggle.textContent = on ? 'ON' : 'OFF';
      toggle.style.borderColor = on ? 'var(--fg)' : '#ccc';
      toggle.style.color = on ? 'var(--fg)' : 'var(--muted)';
    };

    let state = initial;
    update(state);

    toggle.addEventListener('click', () => {
      state = !state;
      update(state);
      onChange(state);
    });

    row.appendChild(labelEl);
    row.appendChild(toggle);
    return row;
  }

  private createSliderRow(
    label: string,
    initial: number,
    onChange: (value: number) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'developer-form-row';
    row.style.padding = '10px 0';
    row.style.borderBottom = '1px solid var(--chrome)';

    const labelEl = document.createElement('span');
    labelEl.className = 'developer-form-label';
    labelEl.style.fontSize = '14px';
    labelEl.textContent = label;

    const sliderWrap = document.createElement('div');
    sliderWrap.style.display = 'flex';
    sliderWrap.style.alignItems = 'center';
    sliderWrap.style.gap = '8px';
    sliderWrap.style.flex = '0 0 auto';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(initial * 100));
    slider.style.width = '100px';
    slider.style.accentColor = 'var(--fg)';

    const valueLabel = document.createElement('span');
    valueLabel.style.fontSize = '12px';
    valueLabel.style.minWidth = '28px';
    valueLabel.style.textAlign = 'right';
    valueLabel.textContent = `${Math.round(initial * 100)}%`;

    slider.addEventListener('input', () => {
      const val = Number(slider.value) / 100;
      valueLabel.textContent = `${Math.round(val * 100)}%`;
      onChange(val);
    });

    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(valueLabel);
    row.appendChild(labelEl);
    row.appendChild(sliderWrap);
    return row;
  }
}
