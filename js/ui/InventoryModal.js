/**
 * ОКНО ИНВЕНТАРЯ
 * ----------------
 * Категоризированный список вещей с компактными карточками, подробностями
 * выбранного предмета и сравнением экипировки с текущим снаряжением.
 */
class InventoryModal extends Modal {

  static CATEGORIES = [
    { id: 'all', name: 'Усе', icon: 'inventory' },
    { id: 'equipment', name: 'Спорядження', icon: 'equipment' },
    { id: 'potions', name: 'Зілля', icon: 'potion' },
    { id: 'elixirs', name: 'Еліксири', icon: 'elixir' },
    { id: 'food', name: 'Їжа', icon: 'hunger' },
    { id: 'water', name: 'Вода', icon: 'thirst' },
  ];

  static SORTS = [
    { id: 'type', name: 'За типом' },
    { id: 'rarity', name: 'За рідкістю' },
    { id: 'level', name: 'За рівнем' },
    { id: 'name', name: 'За назвою' },
  ];

  constructor(game) {
    super(game);
    this.activeCategory = 'all';
    this.sortId = 'type';
    this.selectedKey = null;
    this.detailsOpen = false;
    this.visibleEntries = [];
  }

  get title() {
    return `${Hud.icon('inventory')}<span>Інвентар</span>`;
  }

  get panelClass() {
    return 'inventory-modal';
  }

  open() {
    this.detailsOpen = false;
    super.open();
  }

  contentHtml() {
    const items = this.game.player.inventory.items;
    const counts = this.categoryCounts(items);
    this.visibleEntries = this.sortedEntries(
      this.groupItems(items.filter(item => this.matchesCategory(item)))
    );
    this.normalizeSelection();

    return `
      <div class="inventory-toolbar">
        <nav class="inventory-tabs" aria-label="Категорії інвентаря">
          ${InventoryModal.CATEGORIES.map(category => `
            <button class="inventory-tab${category.id === this.activeCategory ? ' inventory-tab--active' : ''}"
                    data-inventory-category="${category.id}" type="button">
              ${Hud.icon(category.icon)}
              <span>${category.name}</span>
              <b>${counts[category.id] ?? 0}</b>
            </button>
          `).join('')}
        </nav>

        <label class="inventory-sort">
          <span>Сортування</span>
          <select data-inventory-sort>
            ${InventoryModal.SORTS.map(sort => `
              <option value="${sort.id}"${sort.id === this.sortId ? ' selected' : ''}>${sort.name}</option>
            `).join('')}
          </select>
        </label>
      </div>

      <div class="inventory-browser${this.detailsOpen ? ' inventory-browser--details' : ''}">
        <section class="inventory-browser__list" aria-label="Предмети">
          <div class="inventory-grid">
            ${this.visibleEntries.length
              ? this.visibleEntries.map(entry => this.cardHtml(entry)).join('')
              : '<p class="empty inventory-grid__empty">У цій категорії поки що порожньо.</p>'}
          </div>
        </section>

        <aside class="inventory-details" aria-live="polite">
          ${this.detailsHtml(this.selectedEntry())}
        </aside>
      </div>
    `;
  }

  bindContent(content) {
    content.addEventListener('click', event => {
      const categoryButton = event.target.closest('[data-inventory-category]');
      if (categoryButton) {
        this.activeCategory = categoryButton.dataset.inventoryCategory;
        this.selectedKey = null;
        this.detailsOpen = false;
        this.refresh({ preserveListScroll: false });
        return;
      }

      const backButton = event.target.closest('[data-inventory-back]');
      if (backButton) {
        this.detailsOpen = false;
        this.refresh({ preserveListScroll: true });
        return;
      }

      const itemButton = event.target.closest('[data-inventory-select]');
      if (itemButton) {
        const entry = this.visibleEntries.find(candidate =>
          candidate.items.some(item => item.id === itemButton.dataset.inventorySelect));
        if (entry) {
          this.selectedKey = entry.key;
          this.detailsOpen = true;
          this.refresh({ preserveListScroll: true });
        }
        return;
      }

      const actionButton = event.target.closest('[data-inventory-action]');
      if (actionButton) {
        this.handleAction(
          actionButton.dataset.inventoryAction,
          actionButton.dataset.inventoryItem
        );
      }
    });

    content.addEventListener('change', event => {
      if (!event.target.matches('[data-inventory-sort]')) return;
      this.sortId = event.target.value;
      this.detailsOpen = false;
      this.refresh({ preserveListScroll: false });
    });
  }

  refresh({ preserveListScroll = true } = {}) {
    const list = this.overlay?.querySelector('.inventory-browser__list');
    const scrollTop = preserveListScroll ? list?.scrollTop ?? 0 : 0;
    super.refresh();
    const refreshedList = this.overlay?.querySelector('.inventory-browser__list');
    if (refreshedList) refreshedList.scrollTop = scrollTop;
  }

  categoryCounts(items) {
    const counts = { all: items.length };
    InventoryModal.CATEGORIES.slice(1).forEach(category => {
      counts[category.id] = items.filter(item => item.storageCategory === category.id).length;
    });
    return counts;
  }

  matchesCategory(item) {
    return this.activeCategory === 'all' || item.storageCategory === this.activeCategory;
  }

  groupItems(items) {
    const groups = new Map();

    items.forEach(item => {
      const key = this.entryKey(item);
      if (!groups.has(key)) groups.set(key, { key, item, items: [] });
      groups.get(key).items.push(item);
    });

    return [...groups.values()];
  }

  entryKey(item) {
    if (item.isEquipment) return `item:${item.id}`;
    return `stack:${JSON.stringify({
      templateId: item.templateId,
      name: item.name,
      rarity: item.rarity,
      level: item.level,
      effect: item.effect,
    })}`;
  }

  sortedEntries(entries) {
    const rarityRank = { common: 1, rare: 2, legendary: 3 };
    const categoryRank = { equipment: 0, potions: 1, elixirs: 2, food: 3, water: 4, other: 5 };
    const byName = (a, b) => a.item.name.localeCompare(b.item.name, 'uk');
    const comparators = {
      rarity: (a, b) => rarityRank[b.item.rarity] - rarityRank[a.item.rarity]
        || b.item.level - a.item.level || byName(a, b),
      level: (a, b) => b.item.level - a.item.level
        || rarityRank[b.item.rarity] - rarityRank[a.item.rarity] || byName(a, b),
      name: byName,
      type: (a, b) => categoryRank[a.item.storageCategory] - categoryRank[b.item.storageCategory]
        || rarityRank[b.item.rarity] - rarityRank[a.item.rarity]
        || b.item.level - a.item.level || byName(a, b),
    };

    return [...entries].sort(comparators[this.sortId] ?? comparators.type);
  }

  normalizeSelection() {
    if (!this.visibleEntries.some(entry => entry.key === this.selectedKey)) {
      this.selectedKey = this.visibleEntries[0]?.key ?? null;
    }
  }

  selectedEntry() {
    return this.visibleEntries.find(entry => entry.key === this.selectedKey) ?? null;
  }

  cardHtml(entry) {
    const item = entry.item;
    const locked = !item.canUseAtLevel(this.game.player.level);
    const slot = item.isEquipment ? EQUIPMENT_SLOTS[item.slot]?.name : null;

    return `
      <button class="inventory-card rarity-frame--${item.rarity}${entry.key === this.selectedKey ? ' inventory-card--selected' : ''}${locked ? ' inventory-card--locked' : ''}"
              data-inventory-select="${item.id}" type="button">
        ${ItemRow.visual(item, 'inventory-card__icon')}
        ${entry.items.length > 1 ? `<b class="inventory-card__count">×${entry.items.length}</b>` : ''}
        <span class="inventory-card__body">
          <span class="inventory-card__name rarity--${item.rarity}">${item.name}</span>
          <span class="inventory-card__meta">
            ${slot ? `<span>${slot}</span>` : ''}
            ${item.levelScaled ? `<span>Рів. ${item.level}</span>` : ''}
            <span class="rarity--${item.rarity}">${item.rarityInfo.name}</span>
          </span>
          <span class="inventory-card__desc">${item.describe()}</span>
        </span>
        ${locked ? `${Hud.icon('shield', 'inventory-card__lock')}<span class="sr-only">Потрібен рівень ${item.level}</span>` : ''}
      </button>
    `;
  }

  detailsHtml(entry) {
    if (!entry) {
      return `
        <div class="inventory-details__empty">
          ${Hud.icon('inventory')}
          <p>Оберіть предмет, щоб переглянути його властивості.</p>
        </div>
      `;
    }

    const item = entry.item;
    const availability = this.availability(item);
    const slot = item.isEquipment ? EQUIPMENT_SLOTS[item.slot] : null;
    const equipped = slot ? this.game.player.equipment[item.slot] : null;

    return `
      <button class="inventory-details__back" data-inventory-back type="button">
        <span aria-hidden="true">←</span> До списку
      </button>

      <div class="inventory-details__head">
        ${ItemRow.visual(item, 'inventory-details__icon')}
        <div>
          <h3 class="rarity--${item.rarity}">${item.name}</h3>
          <div class="inventory-details__meta">
            ${slot ? `<span>${slot.name}</span>` : ''}
            ${item.levelScaled ? `<span>Рівень ${item.level}</span>` : ''}
            <span class="rarity--${item.rarity}">${item.rarityInfo.name}</span>
            ${entry.items.length > 1 ? `<span>Кількість: ${entry.items.length}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="inventory-details__section">
        <h4>Властивості</h4>
        ${this.propertiesHtml(item)}
      </div>

      ${item.isEquipment ? this.comparisonHtml(item, equipped) : ''}

      <div class="inventory-availability inventory-availability--${availability.available ? 'ready' : 'locked'}">
        ${Hud.icon(availability.available ? 'star' : 'shield')}
        <span>${availability.message}</span>
      </div>

      <div class="inventory-details__actions">
        ${item.isEquipment ? `
          <button class="btn btn--primary" data-inventory-action="equip" data-inventory-item="${item.id}"
                  ${availability.available ? '' : 'disabled'}>Одягти</button>
        ` : ''}
        ${item.isConsumable ? `
          <button class="btn btn--primary" data-inventory-action="consume" data-inventory-item="${item.id}"
                  ${availability.available ? '' : 'disabled'}>Вжити</button>
        ` : ''}
        ${this.game.player.location === 'home' ? `
          <button class="btn" data-inventory-action="to-chest" data-inventory-item="${item.id}">До скрині</button>
        ` : ''}
      </div>
    `;
  }

  propertiesHtml(item) {
    if (!item.isEquipment) {
      return `<p class="inventory-details__description">${item.describe()}</p>`;
    }

    return `
      <div class="inventory-properties">
        ${Object.entries(item.bonuses).map(([aspect, value]) => `
          <div><span>${ASPECTS[aspect].name}</span><b>${ASPECTS[aspect].format(value)}</b></div>
        `).join('')}
      </div>
    `;
  }

  comparisonHtml(item, equipped) {
    if (!equipped) {
      return `
        <div class="inventory-details__section inventory-comparison">
          <h4>Порівняння</h4>
          <p class="inventory-comparison__empty">Слот «${EQUIPMENT_SLOTS[item.slot].name}» зараз вільний.</p>
        </div>
      `;
    }

    const aspects = [...new Set([
      ...Object.keys(item.bonuses),
      ...Object.keys(equipped.bonuses),
    ])];

    return `
      <div class="inventory-details__section inventory-comparison">
        <h4>Порівняння з «${equipped.name}»</h4>
        <div class="inventory-comparison__rows">
          ${aspects.map(aspect => {
            const current = equipped.bonuses[aspect] ?? 0;
            const next = item.bonuses[aspect] ?? 0;
            const delta = next - current;
            const suffix = aspect === 'blockChance' ? '%' : '';
            return `
              <div class="inventory-comparison__row">
                <span>${ASPECTS[aspect].name}</span>
                <small>${current}${suffix} → ${next}${suffix}</small>
                <b class="inventory-delta inventory-delta--${delta > 0 ? 'better' : delta < 0 ? 'worse' : 'same'}">
                  ${delta > 0 ? '+' : ''}${delta}${suffix}
                </b>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  availability(item) {
    const player = this.game.player;
    if (!item.canUseAtLevel(player.level)) {
      return { available: false, message: `Потрібен ${item.level} рівень героя.` };
    }
    if (Needs.isFixed(player) && player.isNeedConsumable(item)) {
      return { available: false, message: 'Нежить не потребує їжі, води та сну.' };
    }
    return {
      available: true,
      message: item.isEquipment ? 'Предмет можна одягнути.' : 'Предмет можна використати.',
    };
  }

  handleAction(action, itemId) {
    const player = this.game.player;
    const item = player.inventory.findById(itemId);
    if (!item) return;
    const selectedKey = this.entryKey(item);

    switch (action) {
      case 'equip':
        if (!player.equip(item)) {
          this.game.toast(`Потрібен рівень ${item.level}!`);
          return;
        }
        this.selectedKey = null;
        this.game.toast(`Одягнено: ${item.name}`);
        break;

      case 'consume':
        if (!player.consume(item)) {
          this.game.toast(Needs.isFixed(player) && player.isNeedConsumable(item)
            ? 'Нежить не потребує їжі, води та сну.'
            : `Потрібен рівень ${item.level}!`);
          return;
        }
        this.selectedKey = selectedKey;
        this.game.audio.playConsumable(item);
        this.game.toast(`Вжито: ${item.name}`);
        break;

      case 'to-chest':
        if (!player.chest.canAdd(item)) {
          this.game.toast(`У цій вкладці скрині вже ${BALANCE.storage.itemsPerCategory} предметів!`);
          return;
        }
        player.inventory.remove(item);
        player.chest.add(item);
        this.selectedKey = selectedKey;
        this.game.toast(`До скрині: ${item.name}`);
        break;

      default:
        return;
    }

    this.game.refresh();
    if (!player.inventory.items.some(candidate => this.entryKey(candidate) === this.selectedKey)) {
      this.detailsOpen = false;
    }
    this.refresh({ preserveListScroll: true });
  }
}
