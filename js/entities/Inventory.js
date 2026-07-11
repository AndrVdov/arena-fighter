/**
 * ХРАНИЛИЩЕ ПРЕДМЕТОВ
 * -------------------
 * Используется и как инвентарь персонажа, и как сундук дома.
 */
class Inventory {

  constructor(items = []) {
    this.items = items;
  }

  add(item) {
    this.items.push(item);
  }

  remove(item) {
    this.items = this.items.filter(i => i.id !== item.id);
  }

  findById(itemId) {
    return this.items.find(i => i.id === itemId) ?? null;
  }

  get isEmpty() {
    return this.items.length === 0;
  }

  /** Забрать всё содержимое, оставив инвентарь пустым. */
  drain() {
    const items = this.items;
    this.items = [];
    return items;
  }

  transferAllTo(targetInventory) {
    const items = this.drain();
    items.forEach(item => targetInventory.add(item));
    return items;
  }

  toJSON() {
    return this.items.map(item => item.toJSON());
  }

  static fromJSON(data, fallbackLevel = 1) {
    return new Inventory((data ?? []).map(item => Item.fromJSON(item, fallbackLevel)));
  }
}
