/**
 * ГЕНЕРАЦИЯ ПРЕДМЕТОВ
 * -------------------
 * Общий фабричный код экипировки для магазина и стартового имущества
 * противников. После боя новые предметы больше не создаются.
 */
class Drops {

  /**
   * Случайный предмет экипировки заданной редкости:
   * случайный слот, имя из пула и бонусы по правилам редкости.
   * Используется и для дропа, и для ассортимента магазина.
   */
  static generateEquipment(rarityId, level = 1) {
    const slot = Drops.randomOf(Object.keys(EQUIPMENT_SLOTS));
    return Drops.generateEquipmentForSlot(slot, rarityId, level);
  }

  static generateEquipmentForSlot(slot, rarityId, level = 1) {
    const name = Drops.randomOf(ITEM_NAME_POOLS[slot][rarityId]);
    const itemLevel = Item.normalizeLevel(level);

    return new Item({
      name,
      icon: EQUIPMENT_SLOTS[slot].icon,
      image: EQUIPMENT_SLOTS[slot].images[rarityId],
      level: itemLevel,
      slot,
      rarity: rarityId,
      bonuses: Drops.rollBonuses(rarityId, itemLevel),
    });
  }

  /** Редкость по переданным весам. */
  static rollRarity(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;

    for (const [rarityId, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) return rarityId;
    }
    return 'common';
  }

  /**
   * Бонусы предмета: редкость определяет вариант — сколько аспектов
   * и какого размера бонус к каждому (без повторов аспектов).
   */
  static rollBonuses(rarityId, level = 1) {
    const sizes = Drops.randomOf(RARITIES[rarityId].variants);
    const availableAspects = Object.keys(ASPECTS);
    const bonuses = {};

    for (const size of sizes) {
      const index = Math.floor(Math.random() * availableAspects.length);
      const aspect = availableAspects.splice(index, 1)[0];
      bonuses[aspect] = Item.scaleValue(
        ASPECTS[aspect][size],
        level,
        ASPECTS[aspect].levelGrowth
      );
    }
    return bonuses;
  }

  static randomOf(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
}
