/**
 * ОКНО СНАРЯЖЕНИЯ
 * ---------------
 * Пять слотов экипировки героя; надетое можно снять в инвентарь.
 */
class EquipmentModal extends Modal {

  get title() {
    return '⚔️ Спорядження';
  }

  contentHtml() {
    const player = this.game.player;

    return Object.values(EQUIPMENT_SLOTS)
      .map(slot => {
        const item = player.equipment[slot.id];

        if (!item) {
          return `
            <div class="item-row item-row--empty">
              <span class="item-row__icon">${slot.icon}</span>
              <div class="item-row__info">
                <div class="item-row__name">${slot.name}</div>
                <div class="item-row__desc">порожньо</div>
              </div>
            </div>
          `;
        }
        return ItemRow.html(
          item,
          [{ action: 'unequip', label: 'Зняти' }],
          `[${slot.name}]`,
          { playerLevel: player.level }
        );
      })
      .join('');
  }

  bindContent(content) {
    ItemRow.onAction(content, (action, itemId) => {
      if (action !== 'unequip') return;

      const player = this.game.player;
      const entry = Object.entries(player.equipment).find(([, item]) => item?.id === itemId);
      if (!entry) return;

      player.unequip(entry[0]);
      this.game.toast('Знято в інвентар.');
      this.game.refresh();
      this.refresh();
    });
  }
}
