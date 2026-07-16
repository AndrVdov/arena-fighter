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
    const consumableModel = BALANCE.shop.consumables.modelVersion;
    const consumablesOutdated = Boolean(data.consumables)
      && data.consumableModelVersion !== consumableModel;
    this.consumables = {};
    for (const category of ShopStock.consumableCategories()) {
      const saved = data.consumables?.[category];
      this.consumables[category] = Array.isArray(saved)
        ? saved.map(item => Item.fromJSON(item, this.playerLevel))
        : ShopStock.rollConsumableCategory(category, this.playerLevel);
    }
    this.refreshAt = consumablesOutdated ? 0 : data.refreshAt ?? 0;
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

  /** Независимо выбрать количество, редкость и шаблон каждого расходника. */
  static rollConsumableCategory(category, playerLevel = 1, random = Math.random) {
    const pool = SHOP_CONSUMABLES[category] ?? [];
    if (!pool.length) return [];

    const count = ShopStock.rollConsumableCount(random);
    return Array.from({ length: count }, () => {
      const rarity = ShopStock.rollConsumableRarity(random);
      const matchingTemplates = pool.filter(template => template.rarity === rarity);
      const candidates = matchingTemplates.length ? matchingTemplates : pool;
      const template = candidates[Math.floor(random() * candidates.length)];
      return Item.fromTemplate(template, ShopStock.rollLevel(playerLevel, random));
    });
  }

  static rollConsumableCount(random = Math.random) {
    return Number(ShopStock.rollWeightedKey(
      BALANCE.shop.consumables.countWeights,
      random
    ));
  }

  static rollConsumableRarity(random = Math.random) {
    return Drops.rollRarity(BALANCE.shop.consumables.rarityWeights, random);
  }

  static rollWeightedKey(weights, random = Math.random) {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    let roll = random() * total;
    for (const [key, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return Object.keys(weights)[0];
  }

  static rollLevel(playerLevel, random = Math.random) {
    const offsets = BALANCE.shop.levelOffsets;
    const offset = offsets[Math.floor(random() * offsets.length)];
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
      consumableModelVersion: BALANCE.shop.consumables.modelVersion,
      refreshAt: this.refreshAt,
    };
  }
}
