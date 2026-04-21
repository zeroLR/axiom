import type { Card } from '../../game/cards';
import { CARD_GLYPHS, setIconHtml } from '../../icons';

export function createPauseCardTag(opts: {
  card: Card;
  level: number;
  onClick: () => void;
  title?: string;
}): HTMLButtonElement {
  const tag = document.createElement('button');
  tag.type = 'button';
  tag.className = 'pause-card-tag';
  tag.title = opts.title ?? `${opts.card.name} · Lv${opts.level}`;
  tag.addEventListener('click', opts.onClick);

  const glyph = document.createElement('span');
  glyph.className = 'pause-card-tag-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  const svgGlyph = CARD_GLYPHS[opts.card.id];
  if (svgGlyph) setIconHtml(glyph, svgGlyph);
  else glyph.textContent = opts.card.glyph;

  const lv = document.createElement('span');
  lv.className = 'pause-card-tag-lv';
  lv.textContent = `Lv${opts.level}`;

  tag.appendChild(glyph);
  tag.appendChild(lv);
  return tag;
}
