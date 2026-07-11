/**
 * АССОРТИМЕНТ МАГАЗИНА
 * --------------------
 * Общая ротация магазина: случайное снаряжение и ограниченный набор
 * расходников в каждой категории. Весь ассортимент обновляется вместе
 * раз в BALANCE.shop.refreshMinutes
 * (или мгновенно за золото). Хранится в сохранении игрока,
 * так что перезагрузка страницы товар не меняет.
 */
class ShopStock {

  constructor(data = {}, playerLevel = 1) {
    this.playerLevel = Item.normalizeLevel(playerLevel);
    this.items = (data.items ?? []).map(item => Item.fromJSON(item, this.playerLevel));
    this.consumables = {};
    for (const category of ShopStock.consumableCategories()) {
      const saved = data.consumables?.[category];
      this.consumables[category] = Array.isArray(saved)
        ? saved.map(item => Item.fromJSON(item, this.playerLevel))
        : ShopStock.rollConsumableCategory(category, this.playerLevel);
    }
    this.refreshAt = data.refreshAt ?? 0; // когда товар устареет (timestamp)
  }

  /** Пора ли генерировать новый ассортимент. */
  get isExpired() {
    return Date.now() >= this.refreshAt;
  }

  /** Сколько миллисекунд осталось до самообновления. */
  get msLeft() {
    return Math.max(0, this.refreshAt - Date.now());
  }

  /** Сгенерировать новый ассортимент. */
  refresh(playerLevel = this.playerLevel) {
    const cfg = BALANCE.shop;
    this.playerLevel = Item.normalizeLevel(playerLevel);
    this.items = [];

    for (let i = 0; i < cfg.stockSize; i++) {
      const rarityId = Drops.rollRarity(cfg.rarityWeights);
      const level = ShopStock.rollLevel(this.playerLevel);
      const item = Drops.generateEquipment(rarityId, level);
      item.price = ShopStock.rollPrice(rarityId, level);
      this.items.push(item);
    }

    for (const category of ShopStock.consumableCategories()) {
      this.consumables[category] = ShopStock.rollConsumableCategory(category, this.playerLevel);
    }

    this.refreshAt = Date.now() + cfg.refreshMinutes * 60_000;
  }

  static consumableCategories() {
    return Object.keys(SHOP_CONSUMABLES);
  }

  /** Выбрать случайные уникальные расходники из пула категории. */
  static rollConsumableCategory(category, playerLevel = 1) {
    const pool = SHOP_CONSUMABLES[category] ?? [];
    const count = Math.min(BALANCE.shop.consumableStockSize, pool.length);
    const shuffled = [...pool];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count)
      .map(template => Item.fromTemplate(template, ShopStock.rollLevel(playerLevel)));
  }

  static rollLevel(playerLevel) {
    const offset = Drops.randomOf(BALANCE.shop.levelOffsets);
    return Math.max(1, Item.normalizeLevel(playerLevel) + offset);
  }

  /** Цена покупки: диапазон редкости, масштабированный уровнем. */
  static rollPrice(rarityId, level = 1) {
    const [min, max] = BALANCE.shop.buyPrice[rarityId];
    const basePrice = min + Math.floor(Math.random() * (max - min + 1));
    return Item.priceForLevel(basePrice, level);
  }

  /** Фиксированная цена мгновенного обновления всего магазина. */
  static rerollCost() {
    return BALANCE.shop.rerollCost;
  }

  findById(itemId) {
    return this.items.find(i => i.id === itemId) ?? null;
  }

  remove(item) {
    this.items = this.items.filter(i => i.id !== item.id);
  }

  getConsumables(category) {
    return this.consumables[category] ?? [];
  }

  findConsumable(category, itemId) {
    return this.getConsumables(category).find(item => item.id === itemId) ?? null;
  }

  removeConsumable(category, item) {
    this.consumables[category] = this.getConsumables(category)
      .filter(candidate => candidate.id !== item.id);
  }

  toJSON() {
    return {
      items: this.items.map(item => item.toJSON()),
      consumables: Object.fromEntries(
        Object.entries(this.consumables)
          .map(([category, items]) => [category, items.map(item => item.toJSON())])
      ),
      refreshAt: this.refreshAt,
    };
  }
}
