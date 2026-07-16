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
      bonuses: Drops.rollEquipmentBonuses(slot, rarityId, itemLevel),
    });
  }

  /** Редкость по переданным весам. */
  static rollRarity(weights, random = Math.random) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = random() * total;

    for (const [rarityId, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) return rarityId;
    }
    return 'common';
  }

  static rollEquipmentBonuses(slot, rarityId, level = 1) {
    const rarity = RARITIES[rarityId] ?? RARITIES.common;
    const rarityBalance = BALANCE.items.equipment.rarity[rarity.id];
    const stats = [...EQUIPMENT_STAT_ASPECTS];
    const selectedStats = [];

    while (selectedStats.length < rarityBalance.secondaryStatCount) {
      const index = Math.floor(Math.random() * stats.length);
      selectedStats.push(stats.splice(index, 1)[0]);
    }
    return Item.equipmentBonuses(slot, rarity.id, level, selectedStats);
  }

  static randomOf(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
}
