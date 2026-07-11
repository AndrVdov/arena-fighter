/**
 * СТРОКА ПРЕДМЕТА
 * ---------------
 * Общий вид предмета в списках (инвентарь, сундук, продажа, дроп):
 * иконка, имя в цвете редкости, описание бонусов и кнопки действий.
 *
 * Экран вешает один обработчик на контейнер и читает
 * data-item-id / data-item-action с нажатой кнопки.
 */
class ItemRow {

  /**
   * @param {Item} item
   * @param {Array<{action: string, label: string, disabled?: boolean}>} buttons
   * @param {string} note — необязательная пометка справа от имени (например, цена)
   */
  static html(item, buttons = [], note = '', { playerLevel = null } = {}) {
    const locked = playerLevel !== null && !item.canUseAtLevel(playerLevel);
    const buttonsHtml = buttons
      .map(b => `
        <button class="btn btn--small" data-item-id="${item.id}" data-item-action="${b.action}"
                ${b.disabled ? 'disabled' : ''}>${b.label}</button>
      `)
      .join('');

    return `
      <div class="item-row${locked ? ' item-row--locked' : ''}">
        ${ItemRow.visual(item, 'item-row__icon')}
        <div class="item-row__info">
          <div class="item-row__name rarity--${item.rarity}">
            ${item.name}${note ? ` <span class="item-row__note">${note}</span>` : ''}
          </div>
          <div class="item-row__meta">
            ${item.levelScaled ? `<span>Рівень ${item.level}</span>` : ''}<span class="rarity--${item.rarity}">${item.rarityInfo.name}</span>
            ${locked ? `<b>Потрібен рівень ${item.level}</b>` : ''}
          </div>
          <div class="item-row__desc">${item.describe()}</div>
        </div>
        <div class="item-row__actions">${buttonsHtml}</div>
      </div>
    `;
  }

  static visual(item, className = '') {
    return `
      <span class="${className} rarity-frame--${item.rarity}">
        <span class="item-visual__fallback">${item.icon}</span>
        ${item.image ? `
          <img src="${item.image}" alt=""
               onload="this.previousElementSibling.hidden=true"
               onerror="this.remove()">
        ` : ''}
      </span>
    `;
  }

  /**
   * Повесить делегированный обработчик действий на контейнер.
   * @param {HTMLElement} container
   * @param {(action: string, itemId: string) => void} handler
   */
  static onAction(container, handler) {
    container.addEventListener('click', event => {
      const button = event.target.closest('[data-item-action]');
      if (button) handler(button.dataset.itemAction, button.dataset.itemId);
    });
  }
}
