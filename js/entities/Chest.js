/**
 * ДОМАШНИЙ СУНДУК
 * ----------------
 * Категоризированное хранилище с независимым лимитом вещей каждой категории
 * и отдельным запасом золота. Наследует интерфейс Inventory, чтобы магазин и
 * существующие операции с предметами работали одинаково.
 */
class Chest extends Inventory {

  constructor(items = [], gold = 0) {
    super(items);
    this.gold = Chest.normalizeGold(gold);
  }

  static get categories() {
    return ['equipment', 'potions', 'elixirs', 'food', 'water'];
  }

  itemsIn(category) {
    return this.items.filter(item => item.storageCategory === category);
  }

  countIn(category) {
    return this.itemsIn(category).length;
  }

  canAdd(item) {
    return Chest.categories.includes(item.storageCategory)
      && this.countIn(item.storageCategory) < BALANCE.storage.itemsPerCategory;
  }

  add(item) {
    if (!this.canAdd(item)) return false;
    super.add(item);
    return true;
  }

  deposit(player, requestedAmount) {
    const capacity = BALANCE.storage.maxGold - this.gold;
    const amount = Math.min(Chest.normalizeAmount(requestedAmount), player.gold, capacity);
    if (amount <= 0) return 0;
    player.gold -= amount;
    this.gold += amount;
    return amount;
  }

  withdraw(player, requestedAmount) {
    const amount = Math.min(Chest.normalizeAmount(requestedAmount), this.gold);
    if (amount <= 0) return 0;
    this.gold -= amount;
    player.gold += amount;
    return amount;
  }

  toJSON() {
    return {
      items: super.toJSON(),
      gold: this.gold,
    };
  }

  static fromJSON(data, fallbackLevel = 1) {
    // Старые сохранения хранили chest как обычный массив предметов.
    const rawItems = Array.isArray(data) ? data : data?.items ?? [];
    const items = rawItems.map(item => Item.fromJSON(item, fallbackLevel));
    return new Chest(items, Array.isArray(data) ? 0 : data?.gold ?? 0);
  }

  static normalizeAmount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  static normalizeGold(value) {
    return Math.min(BALANCE.storage.maxGold, Chest.normalizeAmount(value));
  }
}
