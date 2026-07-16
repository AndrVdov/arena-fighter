/**
 * ЭКРАН СУНДУКА
 * -------------
 * Домашнее категоризированное хранилище вещей и золота. В каждой предметной
 * вкладке действует независимый лимит, который гарантирует сама модель Chest.
 */
class StorageScreen extends Screen {

  constructor(game) {
    super(game);
    this.activeTab = 'equipment';
    this.container = null;
  }

  static CATEGORIES = [
    { id: 'equipment', name: 'Спорядження', icon: 'equipment' },
    { id: 'potions', name: 'Зілля', icon: 'potion' },
    { id: 'elixirs', name: 'Еліксири', icon: 'elixir' },
    { id: 'food', name: 'Їжа', icon: 'hunger' },
    { id: 'water', name: 'Вода', icon: 'thirst' },
    { id: 'gold', name: 'Золото', icon: 'coin' },
  ];

  get id() { return 'storage'; }
  get theme() { return 'home'; }
  get playerLocationId() { return 'home'; }

  render(container) {
    this.container = container;
    container.classList.add('storage-active');
    container.innerHTML = `
      ${this.banner('Скриня', 'Домашнє сховище речей та золота')}

      <section class="storage-scene" aria-label="Скриня">
        <div class="storage-panel">
          <div class="storage-toolbar">
            <button class="btn storage-back" id="back">← Назад</button>
            <div class="storage-toolbar__gold" title="Золото у скрині">
              ${Hud.icon('coin')}<b>${this.game.player.chest.gold}</b>
            </div>
          </div>

          <nav class="storage-tabs" aria-label="Категорії скрині">
            ${StorageScreen.CATEGORIES.map(category => this.tabHtml(category)).join('')}
          </nav>
          <div class="storage-content" id="storage-content"></div>
        </div>
      </section>
    `;

    container.querySelector('#back').addEventListener('click', () => this.game.showScreen('home'));
    container.querySelectorAll('[data-storage-tab]').forEach(button => {
      button.addEventListener('click', () => {
        this.activeTab = button.dataset.storageTab;
        this.updateTabs();
        this.renderActiveTab();
      });
    });
    this.updateTabs();
    this.renderActiveTab();
  }

  tabHtml(category) {
    const count = category.id === 'gold' ? null : this.game.player.chest.countIn(category.id);
    return `
      <button class="storage-tab" data-storage-tab="${category.id}">
        ${Hud.icon(category.icon)}<span>${category.name}</span>
        ${count === null ? '' : `<b>${count}/${BALANCE.storage.itemsPerCategory}</b>`}
      </button>
    `;
  }

  updateTabs() {
    this.container.querySelectorAll('[data-storage-tab]').forEach(button =>
      button.classList.toggle('storage-tab--active', button.dataset.storageTab === this.activeTab));
  }

  renderActiveTab() {
    if (this.activeTab === 'gold') {
      this.renderGoldTab();
      return;
    }

    const chest = this.game.player.chest;
    const items = chest.itemsIn(this.activeTab);
    const content = this.container.querySelector('#storage-content');
    content.innerHTML = `
      <div class="storage-category-head">
        <span>Зайнято місць</span>
        <b>${items.length} / ${BALANCE.storage.itemsPerCategory}</b>
      </div>
      <div class="storage-grid">
        ${items.length
          ? items.map(item => this.itemCard(item)).join('')
          : '<p class="empty">У цій вкладці поки що порожньо.</p>'}
      </div>
    `;

    content.querySelectorAll('[data-chest-action]').forEach(button => {
      button.addEventListener('click', () =>
        this.handleItemAction(button.dataset.chestAction, button.dataset.chestItem));
    });
  }

  itemCard(item) {
    const locked = !item.canUseAtLevel(this.game.player.level);
    return `
      <article class="storage-card rarity-frame--${item.rarity}">
        ${ItemRow.visual(item, 'storage-card__icon')}
        <div class="storage-card__body">
          <div class="storage-card__name rarity--${item.rarity}">${item.name}</div>
          <div class="storage-card__meta">
            ${item.levelScaled ? `<span>Рів. ${item.level}</span>` : ''}
            <span class="rarity--${item.rarity}">${item.rarityInfo.name}</span>
          </div>
          <div class="storage-card__desc">${item.describe()}</div>
        </div>
        <div class="storage-card__actions">
          ${item.isEquipment ? `
            <button class="btn storage-card__action" data-chest-action="equip" data-chest-item="${item.id}"
                    ${locked ? 'disabled' : ''}>Одягти</button>
          ` : ''}
          ${item.isConsumable ? `
            <button class="btn storage-card__action" data-chest-action="consume" data-chest-item="${item.id}"
                    ${locked ? 'disabled' : ''}>Вжити</button>
          ` : ''}
          <button class="btn storage-card__action" data-chest-action="inventory" data-chest-item="${item.id}">До інвентаря</button>
        </div>
      </article>
    `;
  }

  handleItemAction(action, itemId) {
    const player = this.game.player;
    const item = player.chest.findById(itemId);
    if (!item) return;

    if (action === 'inventory') {
      player.chest.remove(item);
      player.inventory.add(item);
      this.game.toast(`До інвентаря: ${item.name}`);
    } else {
      // Player.equip/consume работают с инвентарём: переносим предмет туда
      // транзакционно и возвращаем в сундук, если доменная проверка не прошла.
      player.chest.remove(item);
      player.inventory.add(item);
      const success = action === 'equip' ? player.equip(item) : player.consume(item);
      if (!success) {
        player.inventory.remove(item);
        player.chest.add(item);
        this.game.toast(action === 'consume'
          && Needs.isFixed(player)
          && player.isNeedConsumable(item)
          ? 'Нежить не потребує їжі, води та сну.'
          : `Потрібен рівень ${item.level}!`);
        return;
      }
      if (action === 'consume') this.game.audio.playConsumable(item);
      this.game.toast(`${action === 'equip' ? 'Одягнено' : 'Вжито'}: ${item.name}`);
    }

    this.game.refresh();
    this.render(this.container);
  }

  renderGoldTab() {
    const player = this.game.player;
    const chest = player.chest;
    const content = this.container.querySelector('#storage-content');
    content.innerHTML = `
      <div class="storage-gold">
        <div class="storage-gold__balances">
          <div><span>При собі</span><b>${Hud.icon('coin')}${player.gold}</b></div>
          <div><span>У скрині</span><b>${Hud.icon('coin')}${chest.gold} / ${BALANCE.storage.maxGold}</b></div>
        </div>

        <label class="storage-gold__amount">
          <span>Кількість монет</span>
          <input type="number" id="storage-gold-amount" min="1" max="${BALANCE.storage.maxGold}" value="1">
        </label>

        <div class="storage-gold__actions">
          <button class="btn btn--primary" data-gold-action="deposit">Покласти</button>
          <button class="btn" data-gold-action="withdraw">Забрати</button>
          <button class="btn" data-gold-action="deposit-all">Покласти все</button>
          <button class="btn" data-gold-action="withdraw-all">Забрати все</button>
        </div>
        <p class="storage-gold__hint">Максимум у скрині — ${BALANCE.storage.maxGold} золотих монет.</p>
      </div>
    `;

    content.querySelectorAll('[data-gold-action]').forEach(button => {
      button.addEventListener('click', () => this.handleGold(button.dataset.goldAction));
    });
  }

  handleGold(action) {
    const player = this.game.player;
    const chest = player.chest;
    const input = this.container.querySelector('#storage-gold-amount');
    const requested = action === 'deposit-all' ? player.gold
      : action === 'withdraw-all' ? chest.gold
      : input.value;
    const moved = action.startsWith('deposit')
      ? chest.deposit(player, requested)
      : chest.withdraw(player, requested);

    if (!moved) {
      this.game.toast(action.startsWith('deposit')
        ? 'Немає монет для внесення або скриня заповнена.'
        : 'У скрині немає монет для зняття.');
      return;
    }

    this.game.toast(`${action.startsWith('deposit') ? 'До скрині' : 'Зі скрині'}: ${moved} золота`);
    this.game.refresh();
    this.render(this.container);
  }
}
