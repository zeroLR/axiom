export interface BonusGridRow {
  key: string;
  value: string;
}

export function createBonusGrid(rows: readonly BonusGridRow[]): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'pause-bonus-grid';
  for (const rowData of rows) {
    const row = document.createElement('div');
    row.className = 'pause-bonus-row';

    const key = document.createElement('span');
    key.className = 'pause-bonus-key';
    key.textContent = rowData.key;

    const value = document.createElement('span');
    value.className = 'pause-bonus-value';
    value.textContent = rowData.value;

    row.appendChild(key);
    row.appendChild(value);
    grid.appendChild(row);
  }
  return grid;
}
