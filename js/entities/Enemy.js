/**
 * ПРОТИВНИК
 * ---------
 * Полноценный персонаж арены: честный запас очков своего уровня, собственные
 * экипировка, инвентарь, золото, HP и временные эффекты. Звание влияет только
 * на стартовое имущество, но никогда не умножает характеристики.
 */
class Enemy extends Fighter {

  constructor({ raceId, eliteId, level, strength, agility, vitality,
    equipment, inventory, gold, buffs, needs, hp } = {}) {
    super();
    this.race = RACES[raceId] ?? RACES.bandit;
    this.elite = ELITES[eliteId] ?? ELITES.common;
    this.level = Item.normalizeLevel(level);

    const stats = strength === undefined
      ? Enemy.rollStats(this.race, this.level)
      : { strength, agility, vitality };
    this.strength = stats.strength;
    this.agility = stats.agility;
    this.vitality = stats.vitality;

    this.equipment = Enemy.loadEquipment(equipment, this.level);
    this.inventory = inventory
      ? Inventory.fromJSON(inventory, this.level)
      : Enemy.rollInventory(this.elite, this.level);
    this.gold = gold ?? Enemy.rollGold(this.elite, this.level);
    this.buffs = (buffs ?? []).map(buff => ({ ...buff }));
    this.needs = needs ? { ...needs } : Enemy.rollNeeds();

    if (!equipment) this.equipment = Enemy.rollEquipment(this.elite, this.level);
    this.hp = Math.min(hp ?? this.maxHp, this.maxHp);
  }

  static random(level, forcedEliteId = null) {
    return new Enemy({
      raceId: Enemy.weightedPick(RACES),
      eliteId: forcedEliteId ?? Enemy.weightedPick(ELITES),
      level,
    });
  }

  /** Базовые 5/5/5 + тот же объём распределяемых очков, что у игрока. */
  static rollStats(race, level) {
    const base = BALANCE.player.baseStats;
    const stats = { ...base };
    const points = BALANCE.player.startFreePoints
      + (Item.normalizeLevel(level) - 1) * BALANCE.player.statPointsPerLevel;

    for (let i = 0; i < points; i++) {
      const stat = Enemy.weightedKey(race.statWeights);
      stats[stat]++;
    }
    return stats;
  }

  static rollEquipment(rank, level) {
    const result = Object.fromEntries(Object.keys(EQUIPMENT_SLOTS).map(slot => [slot, null]));
    const slots = [...Object.keys(EQUIPMENT_SLOTS)];
    const count = Math.min(slots.length, Number(Enemy.weightedKey(rank.equipmentCountWeights)));

    for (let i = 0; i < count; i++) {
      const slotIndex = Math.floor(Math.random() * slots.length);
      const slot = slots.splice(slotIndex, 1)[0];
      const rarity = Enemy.weightedKey(rank.equipmentRarityWeights);
      result[slot] = Drops.generateEquipmentForSlot(slot, rarity, level);
    }
    return result;
  }

  static rollInventory(rank, level) {
    const inventory = new Inventory();
    const count = Number(Enemy.weightedKey(rank.inventoryCountWeights));
    const allowedRarities = new Set(Object.keys(rank.equipmentRarityWeights));
    const templates = Object.values(SHOP_CONSUMABLES).flat()
      .filter(template => allowedRarities.has(template.rarity));

    for (let i = 0; i < count && templates.length; i++) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      inventory.add(Item.fromTemplate(template, level));
    }
    return inventory;
  }

  static rollGold(rank, level) {
    const [min, max] = rank.goldPerLevel;
    const perLevel = min + Math.floor(Math.random() * (max - min + 1));
    return rank.goldBase + perLevel * Item.normalizeLevel(level);
  }

  static rollNeeds() {
    const max = BALANCE.needs.max;
    const roll = () => Math.floor(Math.random() * (max + 1));
    return { hunger: roll(), thirst: roll(), sleep: roll() };
  }

  static loadEquipment(data, fallbackLevel) {
    const equipment = {};
    for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
      equipment[slot] = data?.[slot] ? Item.fromJSON(data[slot], fallbackLevel) : null;
    }
    return equipment;
  }

  get title() { return `${this.race.name}${this.elite.id === 'king' ? '-король' : ''}, рів. ${this.level}`; }
  get xpReward() { return BALANCE.enemy.xpBase + this.level * BALANCE.enemy.xpPerLevel; }

  get effectiveStrength() {
    const raw = this.statWithGear('strength');
    return Math.max(1, raw + Needs.bonusFor(this, 'hunger', raw));
  }

  get effectiveAgility() {
    const raw = this.statWithGear('agility');
    return Math.max(1, raw + Needs.bonusFor(this, 'thirst', raw));
  }

  get effectiveVitality() {
    const raw = this.statWithGear('vitality');
    return Math.max(1, raw + Needs.bonusFor(this, 'sleep', raw));
  }

  /** Может применить один полезный расходник перед боем. */
  usePreBattleConsumable() {
    if (Math.random() >= BALANCE.enemy.preBattleConsumableChance) return null;
    const candidates = this.inventory.items.filter(item =>
      item.isConsumable && item.canUseAtLevel(this.level)
        && (item.effect?.buff
          || (item.effect?.hp && this.hp < this.maxHp)
          || (item.effect?.hunger && this.needs.hunger < BALANCE.needs.max)
          || (item.effect?.thirst && this.needs.thirst < BALANCE.needs.max)
          || (item.effect?.sleep && this.needs.sleep < BALANCE.needs.max))
    );
    if (!candidates.length) return null;

    const item = candidates[Math.floor(Math.random() * candidates.length)];
    if (item.effect.hp) this.hp = Math.min(this.maxHp, this.hp + item.effect.hp);
    if (item.effect.hunger) {
      this.needs.hunger = Math.min(BALANCE.needs.max, this.needs.hunger + item.effect.hunger);
    }
    if (item.effect.thirst) {
      this.needs.thirst = Math.min(BALANCE.needs.max, this.needs.thirst + item.effect.thirst);
    }
    if (item.effect.sleep) {
      this.needs.sleep = Math.min(BALANCE.needs.max, this.needs.sleep + item.effect.sleep);
    }
    if (item.effect.buff) {
      const buff = item.effect.buff;
      this.addBuff(buff.stat, buff.value, buff.fights);
    }
    this.inventory.remove(item);
    return item;
  }

  toJSON() {
    return {
      raceId: this.race.id,
      eliteId: this.elite.id,
      level: this.level,
      strength: this.strength,
      agility: this.agility,
      vitality: this.vitality,
      equipment: Object.fromEntries(Object.entries(this.equipment)
        .map(([slot, item]) => [slot, item ? item.toJSON() : null])),
      inventory: this.inventory.toJSON(),
      gold: this.gold,
      buffs: this.buffs.map(buff => ({ ...buff })),
      needs: { ...this.needs },
      hp: this.hp,
    };
  }

  static fromJSON(data) {
    return new Enemy(data);
  }

  static weightedPick(dictionary) {
    return Enemy.weightedKey(Object.fromEntries(Object.values(dictionary)
      .map(entry => [entry.id, entry.spawnWeight])));
  }

  static weightedKey(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return entries[entries.length - 1][0];
  }
}
