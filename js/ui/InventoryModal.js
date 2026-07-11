/**
 * ОКНО ИНВЕНТАРЯ
 * --------------
 * Вещи героя: экипировать, употребить, убрать в сундук
 * (сундук стоит дома, поэтому кнопка видна только там).
 */
class InventoryModal extends Modal {

  get title() {
    return '🎒 Інвентар';
  }

  contentHtml() {
    const inventory = this.game.player.inventory;

    if (inventory.isEmpty) {
      return '<p class="empty">Інвентар порожній. Речі можна купити в крамниці або здобути на арені.</p>';
    }
    return inventory.items.map(item => this.itemRow(item)).join('');
  }

  bindContent(content) {
    ItemRow.onAction(content, (action, itemId) => this.handleAction(action, itemId));
  }

  itemRow(item) {
    const buttons = [];
    const player = this.game.player;
    const locked = !item.canUseAtLevel(player.level);

    if (item.isEquipment)  buttons.push({ action: 'equip', label: 'Одягти', disabled: locked });
    if (item.isConsumable) buttons.push({ action: 'consume', label: 'Вжити', disabled: locked });

    // Скриня стоит дома — убрать вещь в неё можно только оттуда
    if (this.game.player.location === 'home') {
      buttons.push({ action: 'to-chest', label: 'До скрині' });
    }

    return ItemRow.html(item, buttons, '', { playerLevel: player.level });
  }

  handleAction(action, itemId) {
    const player = this.game.player;
    const item = player.inventory.findById(itemId);
    if (!item) return;

    switch (action) {
      case 'equip':
        if (!player.equip(item)) {
          this.game.toast(`Потрібен рівень ${item.level}!`);
          return;
        }
        this.game.toast(`Одягнено: ${item.name}`);
        break;

      case 'consume':
        if (!player.consume(item)) {
          this.game.toast(`Потрібен рівень ${item.level}!`);
          return;
        }
        this.game.toast(`Вжито: ${item.name}`);
        break;

      case 'to-chest':
        if (!player.chest.canAdd(item)) {
          this.game.toast(`У цій вкладці скрині вже ${BALANCE.storage.itemsPerCategory} предметів!`);
          return;
        }
        player.inventory.remove(item);
        player.chest.add(item);
        this.game.toast(`До скрині: ${item.name}`);
        break;
    }

    this.game.refresh();
    this.refresh();
  }
}
