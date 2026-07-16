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
    const isGenerated = inventory === undefined;
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
    this.buffs = Fighter.normalizeBuffs(buffs);
    this.needs = Needs.normalizeFor(this, needs ?? Enemy.rollNeeds());

    if (!equipment) this.equipment = Enemy.rollEquipment(this.elite, this.level);
    if (isGenerated) this.normalizeFoodAndWater();
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
    const equipmentRule = rank.equipment;
    const slots = [...Object.keys(EQUIPMENT_SLOTS)];
    const count = equipmentRule.mode === 'full'
      ? slots.length
      : Math.min(slots.length, Number(Enemy.weightedKey(equipmentRule.countWeights)));

    for (let i = 0; i < count; i++) {
      const slotIndex = Math.floor(Math.random() * slots.length);
      const slot = slots.splice(slotIndex, 1)[0];
      const itemLevel = equipmentRule.mode === 'full'
        ? Enemy.rollEquipmentLevel(level)
        : level;
      result[slot] = Drops.generateEquipmentForSlot(slot, equipmentRule.rarity, itemLevel);
    }
    return result;
  }

  static rollEquipmentLevel(enemyLevel, random = Math.random) {
    const offsets = BALANCE.enemy.equipmentLevelOffsets;
    const offset = offsets[Math.floor(random() * offsets.length)];
    return Math.max(1, Item.normalizeLevel(enemyLevel) + offset);
  }

  static rollInventory(rank, level) {
    const inventory = new Inventory();
    const count = Number(Enemy.weightedKey(rank.inventoryCountWeights));
    const allowedRarities = new Set(rank.inventoryRarities);
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

  get raceName() { return this.race.enemyName ?? this.race.name; }
  get title() { return `${this.raceName}${this.elite.id === 'king' ? '-король' : ''}, рів. ${this.level}`; }
  get xpReward() { return BALANCE.enemy.xpBase + this.level * BALANCE.enemy.xpPerLevel; }
  xpRewardFor(mode) {
    return this.xpReward * (mode === 'lethal' ? BALANCE.xp.lethalVictoryMultiplier : 1);
  }
  get canAcceptChallenge() { return this.hp >= this.maxHp; }
  get challengeStake() { return this.gold; }

  missingChallengeGold(playerGold) {
    return Math.max(0, this.challengeStake - Math.max(0, Number(playerGold) || 0));
  }

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

  /** При генерации сразу употребить всю имеющуюся еду и воду по необходимости. */
  normalizeFoodAndWater() {
    if (Needs.isFixed(this)) return;
    for (const need of ['hunger', 'thirst']) {
      const candidates = this.inventory.items.filter(item => item.effect?.[need]);
      while (this.needs[need] < BALANCE.needs.max && candidates.length) {
        const item = candidates.shift();
        Needs.set(this, need, this.needs[need] + item.effect[need]);
        this.inventory.remove(item);
      }
    }
  }

  /** Перед боем может применить один эликсир с шансом от разницы уровней. */
  usePreBattleElixir(playerLevel) {
    const candidates = this.inventory.items.filter(item =>
      item.effect?.buff && item.canUseAtLevel(this.level));
    if (!candidates.length || Math.random() >= this.elixirChance(playerLevel)) return null;

    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const buff = item.effect.buff;
    this.addBuff(buff.stat, buff.value, buff.fights);
    this.inventory.remove(item);
    return item;
  }

  elixirChance(playerLevel) {
    const chances = BALANCE.enemy.elixirChance;
    if (this.level < playerLevel) return chances.lowerLevel;
    if (this.level > playerLevel) return chances.higherLevel;
    return chances.equalLevel;
  }

  /** Надеть лучшие предметы из инвентаря, возвращая заменённые вещи обратно. */
  equipBestInventoryItems() {
    const equipped = [];
    for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
      const candidates = this.inventory.items.filter(item =>
        item.slot === slot && item.canUseAtLevel(this.level));
      const best = candidates.reduce((winner, item) =>
        !winner || item.powerScore > winner.powerScore ? item : winner, null);
      const current = this.equipment[slot];
      if (!best || (current && best.powerScore <= current.powerScore)) continue;

      this.inventory.remove(best);
      if (current) this.inventory.add(current);
      this.equipment[slot] = best;
      equipped.push(best);
    }
    this.clampHp();
    return equipped;
  }

  /** После победы гарантированно лечиться доступными зельями до полного HP. */
  useHealingPotions() {
    const used = [];
    while (this.hp < this.maxHp) {
      const potions = this.inventory.items.filter(item =>
        item.effect?.hp && item.canUseAtLevel(this.level));
      if (!potions.length) break;

      const missingHp = this.maxHp - this.hp;
      const sufficient = potions
        .filter(item => item.effect.hp >= missingHp)
        .sort((a, b) => a.effect.hp - b.effect.hp)[0];
      const item = sufficient ?? potions.sort((a, b) => b.effect.hp - a.effect.hp)[0];
      this.hp = Math.min(this.maxHp, this.hp + item.effect.hp);
      this.inventory.remove(item);
      used.push(item);
    }
    return used;
  }

  /** Подготовиться после победы над игроком и использования захваченной добычи. */
  prepareAfterVictory() {
    return {
      equipped: this.equipBestInventoryItems(),
      potions: this.useHealingPotions(),
    };
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
