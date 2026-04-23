import { projectedCardText, type Card } from '../game/cards';
import type { CardEntry, CardInventory } from '../game/cardLevels';
import type { PlayScene } from './play';
import { createOverlayTitle, initOverlay } from './ui';
import { CARD_GLYPHS, setIconHtml } from '../icons';
import { FRAGMENT_GLYPHS } from '../icons';
import { createBonusGrid } from './components/bonusGrid';
import { createPauseCardTag } from './components/cardTag';
import { FRAGMENT_META } from '../game/fragments';

export interface PauseOverlayOptions {
  play: PlayScene;
  avatarId: number;
  runInventory: CardInventory;
  resolveCardName: (cardId: string) => string;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

function createPausePanel(title: string, body: HTMLElement): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'pause-panel';

  const panelTitle = document.createElement('div');
  panelTitle.className = 'pause-panel-title';
  panelTitle.textContent = title;
  panel.appendChild(panelTitle);
  panel.appendChild(body);
  return panel;
}

function openPauseCardDetails(
  entry: CardEntry,
  resolveCardName: (cardId: string) => string,
): void {
  const dialog = document.createElement('dialog');
  dialog.className = 'developer-dialog pause-detail-dialog';
  dialog.setAttribute('aria-label', `${entry.card.name} details`);

  const container = document.createElement('div');
  container.className = 'developer-form';

  const heading = createOverlayTitle(`${entry.card.name} · Lv${entry.level}`);
  container.appendChild(heading);

  const previewCard = document.createElement('div');
  previewCard.className = 'developer-enhance-preview';
  const previewGlyph = document.createElement('span');
  previewGlyph.className = 'developer-enhance-preview-glyph';
  previewGlyph.setAttribute('aria-hidden', 'true');
  const svgGlyph = CARD_GLYPHS[entry.card.id];
  if (svgGlyph) setIconHtml(previewGlyph, svgGlyph);
  else previewGlyph.textContent = entry.card.glyph;
  const previewBody = document.createElement('div');
  previewBody.className = 'developer-enhance-preview-body';
  const previewName = document.createElement('div');
  previewName.className = 'developer-enhance-preview-name';
  previewName.textContent = `${entry.card.name} · ${entry.rarity}`;
  const previewDesc = document.createElement('div');
  previewDesc.className = 'developer-enhance-preview-desc';
  previewDesc.textContent = entry.card.text;
  const previewScaled = document.createElement('div');
  previewScaled.className = 'developer-enhance-preview-scaled';
  previewScaled.textContent = `Lv${entry.level}: ${projectedCardText(entry.card, entry.level)}`;
  previewBody.appendChild(previewName);
  previewBody.appendChild(previewDesc);
  previewBody.appendChild(previewScaled);
  previewCard.appendChild(previewGlyph);
  previewCard.appendChild(previewBody);
  container.appendChild(previewCard);

  const statusLabel =
    entry.sourceCardIds.length > 1
      ? `merged (${entry.sourceCardIds.length} cards)`
      : 'held';
  const detailsPanel = createPausePanel(
    'ability values',
    createBonusGrid([
      { key: 'status', value: statusLabel },
      { key: 'rarity', value: entry.rarity },
      { key: 'level', value: `${entry.level}` },
      { key: 'scaled', value: projectedCardText(entry.card, entry.level) },
    ]),
  );
  container.appendChild(detailsPanel);

  if (entry.sourceCardIds.length > 1) {
    const sourceText = document.createElement('div');
    sourceText.className = 'card-text';
    sourceText.textContent = `shared with: ${entry.sourceCardIds.map((id) => resolveCardName(id)).join(', ')}`;
    container.appendChild(sourceText);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'menu-btn';
  closeBtn.textContent = 'close';
  closeBtn.addEventListener('click', () => dialog.close());
  container.appendChild(closeBtn);

  dialog.appendChild(container);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.appendChild(dialog);
  dialog.showModal();
}

function sortedPauseEntries(runInventory: CardInventory): CardEntry[] {
  const rarityRank: Record<Card['rarity'], number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
  };
  return [...runInventory.all().values()].sort((a, b) => {
    const rankDelta = rarityRank[a.rarity] - rarityRank[b.rarity];
    if (rankDelta !== 0) return rankDelta;
    return a.card.name.localeCompare(b.card.name);
  });
}

export function renderPauseOverlay(opts: PauseOverlayOptions): void {
  const { inner } = initOverlay();
  inner.appendChild(createOverlayTitle('paused'));

  const avatar = opts.play.world.get(opts.avatarId);
  if (avatar?.avatar && avatar.weapon) {
    const bonusRows: Array<{ key: string; value: string }> = [
      { key: 'damage', value: `${avatar.weapon.damage}` },
      { key: 'fire interval', value: `${avatar.weapon.period.toFixed(2)}s` },
      { key: 'projectile speed', value: `${Math.round(avatar.weapon.projectileSpeed)}` },
      { key: 'projectiles', value: `${avatar.weapon.projectiles}` },
      { key: 'pierce', value: `${avatar.weapon.pierce}` },
      { key: 'crit', value: `${Math.round(avatar.weapon.crit * 100)}%` },
      { key: 'move speed', value: `${Math.round(avatar.avatar.speedMul * 100)}%` },
      { key: 'max hp', value: `${avatar.avatar.maxHp}` },
      { key: 'ricochet', value: `${avatar.weapon.ricochet}` },
      { key: 'chain', value: `${avatar.weapon.chain}` },
    ];
    if (avatar.weapon.burnDps > 0) {
      bonusRows.push({
        key: 'burn',
        value: `${avatar.weapon.burnDps.toFixed(2)} dps / ${avatar.weapon.burnDuration.toFixed(1)}s`,
      });
    }
    if (avatar.weapon.slowPct > 0) {
      bonusRows.push({
        key: 'slow',
        value: `${Math.round(avatar.weapon.slowPct * 100)}% / ${avatar.weapon.slowDuration.toFixed(1)}s`,
      });
    }

    const bonusesPanel = createPausePanel(
      'current bonuses',
      createBonusGrid(bonusRows),
    );
    inner.appendChild(bonusesPanel);
  }

  const list = document.createElement('div');
  list.className = 'pause-card-tag-list';
  const entries = sortedPauseEntries(opts.runInventory);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card-text';
    empty.textContent = 'no card abilities yet';
    list.appendChild(empty);
  }

  for (const entry of entries) {
    list.appendChild(
      createPauseCardTag({
        card: entry.card,
        level: entry.level,
        onClick: () => openPauseCardDetails(entry, opts.resolveCardName),
      }),
    );
  }

  const statusPanel = createPausePanel('card abilities', list);
  if (entries.length > 0) {
    const hint = document.createElement('div');
    hint.className = 'card-text';
    hint.textContent = 'tap a tag for full details';
    statusPanel.appendChild(hint);
  }
  inner.appendChild(statusPanel);

  const fragments = opts.play.getRunFragments();
  const fragmentRows = FRAGMENT_META.filter(
    (meta) => fragments.detailed[meta.id] > 0,
  );
  const fragList = document.createElement('div');
  fragList.className = 'pause-fragment-list';
  if (fragmentRows.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card-text';
    empty.textContent = 'no fragments collected yet';
    fragList.appendChild(empty);
  } else {
    for (const meta of fragmentRows) {
      const row = document.createElement('div');
      row.className = 'pause-fragment-row';
      const glyph = document.createElement('span');
      glyph.className = 'pause-card-tag-glyph';
      const svg = FRAGMENT_GLYPHS[meta.id];
      if (svg) setIconHtml(glyph, svg);
      else glyph.textContent = '•';
      row.appendChild(glyph);
      const name = document.createElement('span');
      name.className = 'pause-bonus-key';
      name.textContent = meta.label;
      row.appendChild(name);
      const count = document.createElement('span');
      count.className = 'pause-bonus-value';
      count.textContent = `×${fragments.detailed[meta.id]}`;
      row.appendChild(count);
      fragList.appendChild(row);
    }
  }
  inner.appendChild(createPausePanel('fragments', fragList));

  const resumeBtn = document.createElement('button');
  resumeBtn.type = 'button';
  resumeBtn.className = 'big-btn';
  resumeBtn.textContent = 'resume';
  resumeBtn.addEventListener('click', opts.onResume);
  inner.appendChild(resumeBtn);

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'menu-btn';
  restartBtn.textContent = 'restart';
  restartBtn.addEventListener('click', opts.onRestart);
  inner.appendChild(restartBtn);

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'menu-btn';
  menuBtn.textContent = 'main menu';
  menuBtn.addEventListener('click', opts.onMainMenu);
  inner.appendChild(menuBtn);
}
