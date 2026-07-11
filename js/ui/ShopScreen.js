/**
 * ЭКРАН МАГАЗИНА
 * --------------
 * Вкладка «Спорядження» — случайный ассортимент, который
 * обновляется по таймеру (или мгновенно за золото).
 * Расходники тоже имеют конечный ассортимент и обновляются вместе
 * со снаряжением. Плюс продажа предметов из инвентаря и сундука.
 */
class ShopScreen extends LocationScreen {

  constructor(game) {
    super(game);
    this.activeTab = 'equipment';
    this.timerInterval = null;
    this.merchantMessage = null;
  }

  get locationId() {
    return 'shop';
  }

  render(container) {
    this.container = container;
    clearInterval(this.timerInterval);

    // Один таймер и одна ротация для всего магазина.
    if (this.game.player.shopStock.isExpired) {
      this.game.player.shopStock.refresh(this.game.player.level);
      this.game.save();
    }

    const tabs = [...SHOP_CATEGORIES, { id: 'sell', name: 'Продати', icon: '💰' }]
      .map(tab => `
        <button class="shop-tab${tab.id === this.activeTab ? ' shop-tab--active' : ''}"
                data-tab="${tab.id}" aria-label="${tab.name}" aria-selected="${tab.id === this.activeTab}">
          ${Hud.icon(this.tabIcon(tab.id))}<span>${tab.name}</span>
        </button>
      `)
      .join('');

    container.innerHTML = `
      ${this.banner(this.location.name, this.location.subtitle)}

      <div class="shop-scene">
        <section class="shop-panel" aria-label="Товари крамниці">
          ${this.stockBarHtml()}
          <nav class="shop-tabs" aria-label="Категорії товарів">${tabs}</nav>
          <div id="shop-content" class="shop-content"></div>
        </section>

        <aside class="shopkeeper" aria-label="Крамар">
          <div class="shopkeeper__speech">${this.merchantMessage || this.defaultMerchantMessage()}</div>
          <img src="assets/npcs/merchant.png" alt="Крамар">
        </aside>
      </div>
    `;

    container.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => {
        this.activeTab = button.dataset.tab;
        this.merchantMessage = null;
        this.render(container);
      });
    });

    if (this.activeTab === 'sell') this.renderSellTab();
    else if (this.activeTab === 'equipment') this.renderEquipmentTab();
    else this.renderConsumablesTab();

    this.bindStockControls(container);
  }

  tabIcon(tabId) {
    return {
      equipment: 'equipment',
      potions: 'potion',
      elixirs: 'elixir',
      food: 'hunger',
      water: 'thirst',
      sell: 'coin',
    }[tabId] || 'star';
  }

  defaultMerchantMessage() {
    return this.activeTab === 'sell'
      ? 'Показуй, що приніс. За добру річ дам чесну ціну.'
      : 'Дивись уважно — кращий товар довго на полиці не лежить.';
  }

  speak(message) {
    this.merchantMessage = message;
    const speech = this.container?.querySelector('.shopkeeper__speech');
    if (speech) {
      speech.textContent = message;
      speech.classList.remove('shopkeeper__speech--pulse');
      void speech.offsetWidth;
      speech.classList.add('shopkeeper__speech--pulse');
    }
  }

  pulseGold() {
    const gold = document.querySelector('.hud__gold');
    if (!gold) return;
    gold.classList.remove('hud__gold--changed');
    void gold.offsetWidth;
    gold.classList.add('hud__gold--changed');
  }

  stockBarHtml() {
    const player = this.game.player;
    const rerollCost = ShopStock.rerollCost();

    return `
      <div class="shop-stockbar">
        <span class="shop-stockbar__timer">${Hud.icon('refresh')}Новий товар через <b id="stock-timer">--:--</b></span>
        <button class="shop-reroll" id="reroll-stock" ${player.gold < rerollCost ? 'disabled' : ''}>
          ${Hud.icon('star')}<span>Оновити все</span><b>${rerollCost}</b>${Hud.icon('coin')}
        </button>
      </div>
    `;
  }

  bindStockControls(content) {
    content.querySelector('#reroll-stock').addEventListener('click', () => this.reroll());
    this.startStockTimer();
  }

  // ===== Снаряжение: ротация ассортимента =====

  renderEquipmentTab() {
    const player = this.game.player;
    const stock = player.shopStock;

    const rows = stock.items.length
      ? stock.items.map(item => this.stockRow(item, player.gold)).join('')
      : '<p class="empty">Усе розкупили! Зачекай на новий товар.</p>';

    const content = this.container.querySelector('#shop-content');
    content.innerHTML = `
      <div class="shop-grid">${rows}</div>
    `;

    content.querySelectorAll('[data-stock-id]').forEach(button => {
      button.addEventListener('click', () => this.buyStockItem(button.dataset.stockId));
    });

  }

  stockRow(item, gold) {
    const tooExpensive = item.price > gold;
    const locked = !item.canUseAtLevel(this.game.player.level);

    return `
      <article class="shop-card${tooExpensive ? ' shop-card--expensive' : ''}${locked ? ' shop-card--locked' : ''}">
        ${ItemRow.visual(item, 'shop-card__icon')}
        <div class="shop-card__body">
          <div class="shop-card__name rarity--${item.rarity}">${item.name}</div>
          <div class="shop-card__meta">
            ${item.levelScaled ? `<span>Рів. ${item.level}</span>` : ''}<span class="rarity--${item.rarity}">${item.rarityInfo.name}</span>
            ${locked ? `<b>Ще недоступно</b>` : ''}
          </div>
          <div class="shop-card__desc">${item.describe()}</div>
        </div>
        <div class="shop-card__footer">
          <span class="shop-card__price">${Hud.icon('coin')}<b>${item.price}</b></span>
          <button class="shop-buy" data-stock-id="${item.id}">
            Купити
          </button>
        </div>
      </article>
    `;
  }

  buyStockItem(itemId) {
    const player = this.game.player;
    const stock = player.shopStock;
    const item = stock.findById(itemId);
    if (!item) return;
    if (player.gold < item.price) {
      this.speak('Гарна річ, але твій гаманець поки що надто легкий.');
      this.game.toast('Не вистачає золота!');
      return;
    }

    player.gold -= item.price;
    stock.remove(item);
    player.inventory.add(item);

    this.merchantMessage = `Вдалий вибір. ${item.name} тепер твоє.`;
    this.game.toast(`Куплено: ${item.name}`);
    this.game.refresh();
    this.pulseGold();
    this.render(this.container);
  }

  /** Мгновенное обновление ассортимента за золото. */
  reroll() {
    const player = this.game.player;
    const cost = ShopStock.rerollCost();
    if (player.gold < cost) return;

    player.gold -= cost;
    player.shopStock.refresh(player.level);

    this.merchantMessage = 'Ось інша добірка. Може, тепер щось припаде до душі.';
    this.game.toast('Крамар виклав новий товар!');
    this.game.refresh();
    this.pulseGold();
    this.render(this.container);
  }

  /** Живой обратный отсчёт до самообновления товара. */
  startStockTimer() {
    const label = this.container.querySelector('#stock-timer');

    const update = () => {
      if (!label.isConnected) {
        clearInterval(this.timerInterval);
        return;
      }

      const stock = this.game.player.shopStock;
      if (stock.isExpired) {
        clearInterval(this.timerInterval);
        this.render(this.container); // время вышло — завозим новый товар
        return;
      }

      const totalSeconds = Math.ceil(stock.msLeft / 1000);
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      label.textContent = `${minutes}:${seconds}`;
    };

    update();
    this.timerInterval = setInterval(update, 1000);
  }

  // ===== Расходники: конечный ассортимент общей ротации =====

  renderConsumablesTab() {
    const content = this.container.querySelector('#shop-content');
    const player = this.game.player;
    const items = player.shopStock.getConsumables(this.activeTab);
    const rows = items.length
      ? items.map(item => this.consumableRow(item, player.gold)).join('')
      : '<p class="empty">Усе розкупили! Новий товар з\'явиться після оновлення.</p>';

    content.innerHTML = `
      <div class="shop-grid shop-grid--consumables">
        ${rows}
      </div>
    `;

    content.querySelectorAll('[data-consumable-id]').forEach(button => {
      button.addEventListener('click', () => this.buyConsumable(button.dataset.consumableId));
    });
  }

  consumableRow(item, gold) {
    const tooExpensive = item.price > gold;
    const locked = !item.canUseAtLevel(this.game.player.level);

    return `
      <article class="shop-card shop-card--consumable${tooExpensive ? ' shop-card--expensive' : ''}${locked ? ' shop-card--locked' : ''}">
        ${ItemRow.visual(item, 'shop-card__icon')}
        <div class="shop-card__body">
          <div class="shop-card__name rarity--${item.rarity}">${item.name}</div>
          <div class="shop-card__meta">
            ${item.levelScaled ? `<span>Рів. ${item.level}</span>` : ''}<span class="rarity--${item.rarity}">${item.rarityInfo.name}</span>
            ${locked ? `<b>Ще недоступно</b>` : ''}
          </div>
          <div class="shop-card__desc">${item.describe()}</div>
        </div>
        <div class="shop-card__footer">
          <span class="shop-card__price">${Hud.icon('coin')}<b>${item.price}</b></span>
          <button class="shop-buy" data-consumable-id="${item.id}">
            Купити
          </button>
        </div>
      </article>
    `;
  }

  buyConsumable(itemId) {
    const player = this.game.player;
    const stock = player.shopStock;
    const item = stock.findConsumable(this.activeTab, itemId);
    if (!item) return;

    if (player.gold < item.price) {
      this.speak('Без монет навіть найкраще зілля залишиться на полиці.');
      this.game.toast('Не вистачає золота!');
      return;
    }

    player.gold -= item.price;
    stock.removeConsumable(this.activeTab, item);
    player.inventory.add(item);

    this.merchantMessage = `Тримай. ${item.name} ще не раз стане тобі в пригоді.`;
    this.game.toast(`Куплено: ${item.name}`);
    this.game.refresh();
    this.pulseGold();
    this.render(this.container);
  }

  // ===== Продажа =====

  renderSellTab() {
    const content = this.container.querySelector('#shop-content');
    const player = this.game.player;

    content.innerHTML = `
      <div class="shop-sell-grid">
        ${this.sellSection('Інвентар', 'inventory', player.inventory, 'inventory')}
        ${this.sellSection('Скриня', 'chest', player.chest, 'chest')}
      </div>
    `;

    ItemRow.onAction(content, (action, itemId) => {
      const source = action === 'sell-inventory' ? player.inventory : player.chest;
      this.sell(source, itemId);
    });
  }

  sellSection(title, icon, storage, sourceName) {
    const rows = storage.isEmpty
      ? '<p class="empty">Порожньо</p>'
      : storage.items
          .map(item => ItemRow.html(
            item,
            [{ action: `sell-${sourceName}`, label: 'Продати' }],
            `🪙 ${item.sellPrice}`,
            { playerLevel: this.game.player.level }
          ))
          .join('');

    return `
      <section class="sell-section">
        <div class="sell-section__title">${Hud.icon(icon)}<span>${title}</span></div>
        ${rows}
      </section>
    `;
  }

  sell(storage, itemId) {
    const item = storage.findById(itemId);
    if (!item) return;

    storage.remove(item);
    this.game.player.gold += item.sellPrice;

    this.merchantMessage = `Домовились. ${item.sellPrice} монет — чесна ціна.`;
    this.game.toast(`Продано: ${item.name} (+${item.sellPrice} 🪙)`);
    this.game.refresh();
    this.pulseGold();
    this.render(this.container);
  }
}
