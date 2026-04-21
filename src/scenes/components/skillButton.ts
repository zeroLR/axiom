import {
  iconAxisFreeze,
  iconBarrage,
  iconClone,
  iconLifesteal,
  iconOverload,
  iconReflect,
  iconTimeStop,
  setIconHtml,
} from '../../icons';
import type { PrimalSkillId } from '../../game/data/types';

export interface SkillButtonState {
  id: PrimalSkillId;
  active: number;
  cooldown: number;
}

const SKILL_ICONS: Record<PrimalSkillId, string> = {
  timeStop: iconTimeStop,
  shadowClone: iconClone,
  reflectShield: iconReflect,
  barrage: iconBarrage,
  lifestealPulse: iconLifesteal,
  axisFreeze: iconAxisFreeze,
  overload: iconOverload,
};

const SKILL_LABELS: Record<PrimalSkillId, string> = {
  timeStop: 'Time Stop',
  shadowClone: 'Clone',
  reflectShield: 'Shield',
  barrage: 'Barrage',
  lifestealPulse: 'Lifesteal',
  axisFreeze: 'Freeze',
  overload: 'Overload',
};

export function createSkillButton(
  skill: SkillButtonState,
  onClick: () => void,
): { button: HTMLButtonElement; update: () => void } {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'skill-btn';
  button.addEventListener('click', onClick);

  const update = (): void => {
    setIconHtml(button, SKILL_ICONS[skill.id]);
    if (skill.active > 0) {
      button.append(` ${skill.active.toFixed(1)}s`);
      button.disabled = true;
      return;
    }
    if (skill.cooldown > 0) {
      button.append(` ${Math.ceil(skill.cooldown)}s`);
      button.disabled = true;
      return;
    }
    button.append(` ${SKILL_LABELS[skill.id]}`);
    button.disabled = false;
  };

  update();
  return { button, update };
}
