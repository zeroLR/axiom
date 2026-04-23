import { Container } from 'pixi.js';
import type { Scene } from './scene';
import type { BossChestReward } from '../game/rewards';
import { closeOverlay, createOverlaySub, createOverlayTitle, initOverlay } from './ui';

interface BossRewardCallbacks {
  onConfirm: () => void;
}

const TIER_META: Record<BossChestReward['tier'], { name: string; cls: string }> = {
  white: { name: 'white tier', cls: 'white' },
  blue: { name: 'blue tier', cls: 'blue' },
  crimson: { name: 'crimson tier', cls: 'crimson' },
};

export class BossRewardScene implements Scene {
  readonly root: Container;
  private readonly reward: BossChestReward;
  private readonly cb: BossRewardCallbacks;

  constructor(reward: BossChestReward, cb: BossRewardCallbacks) {
    this.root = new Container();
    this.reward = reward;
    this.cb = cb;
  }

  enter(): void {
    const { inner } = initOverlay();
    const tier = TIER_META[this.reward.tier];
    inner.appendChild(createOverlayTitle('boss core stabilized'));
    inner.appendChild(createOverlaySub('open the crystal chest'));

    const panel = document.createElement('div');
    panel.className = 'boss-reward-panel';

    const box = document.createElement('button');
    box.type = 'button';
    box.className = 'boss-reward-box';
    box.innerHTML = `
      <span class="boss-reward-box-core" aria-hidden="true"></span>
      <span class="boss-reward-box-label">crystal core</span>
    `;
    panel.appendChild(box);

    const rarity = document.createElement('div');
    rarity.className = 'boss-reward-tier';
    rarity.textContent = `tier: ${tier.name}`;
    rarity.hidden = true;
    panel.appendChild(rarity);

    const result = document.createElement('div');
    result.className = 'pause-panel';
    result.hidden = true;
    const rows = document.createElement('div');
    rows.className = 'pause-bonus-grid';

    const fragRow = document.createElement('div');
    fragRow.className = 'pause-bonus-row';
    fragRow.innerHTML = `<span class="pause-bonus-key">boss fragments</span><span class="pause-bonus-value">+${this.reward.bossFragments}</span>`;
    rows.appendChild(fragRow);

    const coreRow = document.createElement('div');
    coreRow.className = 'pause-bonus-row';
    coreRow.innerHTML = `<span class="pause-bonus-key">primal core</span><span class="pause-bonus-value">${this.reward.core > 0 ? '+1' : 'none'}</span>`;
    rows.appendChild(coreRow);

    result.appendChild(rows);
    panel.appendChild(result);
    inner.appendChild(panel);

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'big-btn';
    confirmBtn.textContent = 'confirm settlement';
    confirmBtn.hidden = true;
    confirmBtn.addEventListener('click', () => this.cb.onConfirm());
    inner.appendChild(confirmBtn);

    box.addEventListener('click', () => {
      box.classList.add(`boss-reward-box--${tier.cls}`);
      box.classList.add('boss-reward-box--opened');
      box.disabled = true;
      rarity.hidden = false;
      result.hidden = false;
      confirmBtn.hidden = false;
    });
  }

  exit(): void {
    closeOverlay();
  }

  update(_dt: number): void {}
  render(_alpha: number): void {}
}
