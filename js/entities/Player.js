/**
 * ИГРОК
 * -----
 * Персонаж игрока: характеристики, уровень, золото, потребности,
 * инвентарь, сундук, экипировка и временные баффы.
 *
 * «Эффективные» характеристики учитывают бонусы экипировки,
 * действующие эликсиры и состояние потребностей.
 */
class Player extends Fighter {

  constructor(data = {}) {
    super();
    const base = BALANCE.player;

    this.name = data.name ?? 'Герой';
    this.race = RACES[data.raceId] ?? RACES.bandit;

    // Базовые характеристики (без бонусов)
    this.strength = data.strength ?? base.baseStats.strength;
    this.agility  = data.agility  ?? base.baseStats.agility;
    this.vitality = data.vitality ?? base.baseStats.vitality;

    // Прогресс
    this.level = data.level ?? 1;
    this.xp    = data.xp    ?? 0;
    this.gold  = data.gold  ?? base.startGold;
    this.freeStatPoints = data.freeStatPoints ?? 0;
    this.worldTimeMinutes = data.worldTimeMinutes ?? 0;

    // Предметы
    this.inventory = Inventory.fromJSON(data.inventory, this.level);
    this.chest     = Chest.fromJSON(data.chest, this.level);
    this.equipment = {};
    for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
      this.equipment[slot] = data.equipment?.[slot]
        ? Item.fromJSON(data.equipment[slot], this.level)
        : null;
    }

    // Временные баффы от эликсиров: { stat, value, fightsLeft }
    this.buffs = data.buffs ?? [];

    // Ассортимент магазина (ротация привязана к герою и его сейву)
    this.shopStock = new ShopStock(data.shopStock ?? {}, this.level);

    // Состав противников арены (тоже живёт в сейве)
    this.arenaLineup = new ArenaLineup(data.arenaLineup ?? {});

    // Потребности: голод / жажда / сон.
    // ВАЖНО: инициализируются до hp — maxHp зависит от сна (через Жизнь).
    this.needs = Needs.normalize(data.needs);

    // Здоровье (максимум зависит от Жизни, экипировки и сна)
    this.hp = data.hp ?? this.maxHp;

    // Текущая локация (по спеке игра всегда начинается дома)
    this.location = data.location ?? 'home';
  }

  // ===== Экипировка =====

  /** Надеть предмет из инвентаря; прежний предмет слота вернётся в инвентарь. */
  equip(item) {
    if (!item.isEquipment || !item.canUseAtLevel(this.level)) return false;

    this.inventory.remove(item);
    const replaced = this.equipment[item.slot];
    if (replaced) this.inventory.add(replaced);

    this.equipment[item.slot] = item;
    this.clampHp();
    return true;
  }

  /** Снять предмет со слота в инвентарь. */
  unequip(slot) {
    const item = this.equipment[slot];
    if (!item) return;

    this.equipment[slot] = null;
    this.inventory.add(item);
    this.clampHp();
  }

  // ===== Баффы от эликсиров =====

  // ===== Производные характеристики =====

  /** Жизнь: сон даёт ±10% (🌙 полный — бонус, пустой — штраф). */
  get effectiveVitality() {
    const raw = this.statWithGear('vitality');
    return Math.max(1, raw + Needs.bonusFor(this, 'sleep', raw));
  }

  /** Сила: сытость даёт ±10% (🍗 полная — бонус, пустая — штраф). */
  get effectiveStrength() {
    const raw = this.statWithGear('strength');
    return Math.max(1, raw + Needs.bonusFor(this, 'hunger', raw));
  }

  /** Ловкость: жажда даёт ±10% (💧 полная — бонус, пустая — штраф). */
  get effectiveAgility() {
    const raw = this.statWithGear('agility');
    return Math.max(1, raw + Needs.bonusFor(this, 'thirst', raw));
  }

  get xpToNextLevel() {
    return Math.round(BALANCE.xp.baseXp * Math.pow(BALANCE.xp.growth, this.level - 1));
  }

  // ===== Прогресс =====

  /** Начислить опыт. Возвращает количество полученных уровней. */
  gainXp(amount) {
    this.xp += amount;
    let levelsGained = 0;

    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      this.freeStatPoints += BALANCE.player.statPointsPerLevel;
      levelsGained++;
    }

    if (levelsGained > 0 && BALANCE.levelUp.fullHeal) this.hp = this.maxHp;
    return levelsGained;
  }

  /** Потерять часть прогресса текущего уровня, не понижая сам уровень. */
  loseCurrentLevelXp(rate) {
    const lostXp = Math.floor(this.xp * Math.max(0, rate));
    this.xp = Math.max(0, this.xp - lostXp);
    return lostXp;
  }

  /** Вложить свободное очко в характеристику (strength / agility / vitality). */
  spendStatPoint(stat) {
    if (this.freeStatPoints <= 0) return false;

    const previousMaxHp = this.maxHp;
    this[stat]++;
    this.freeStatPoints--;
    if (stat === 'vitality') this.hp += this.maxHp - previousMaxHp;
    return true;
  }

  get portrait() {
    return this.race.playerPortrait ?? this.race.portrait;
  }

  // ===== Расходники =====

  /** Употребить предмет: лечение, еда, вода, сон или эликсир-бафф. */
  consume(item) {
    if (!item.isConsumable || !item.canUseAtLevel(this.level)) return false;

    const e = item.effect;
    const needsMax = BALANCE.needs.max;

    if (e.hp)     this.hp = Math.min(this.maxHp, this.hp + e.hp);
    if (e.hunger) this.needs.hunger = Math.min(needsMax, this.needs.hunger + e.hunger);
    if (e.thirst) this.needs.thirst = Math.min(needsMax, this.needs.thirst + e.thirst);
    if (e.sleep)  this.needs.sleep  = Math.min(needsMax, this.needs.sleep + e.sleep);
    if (e.buff)   this.addBuff(e.buff.stat, e.buff.value, e.buff.fights);

    this.inventory.remove(item);
    return true;
  }

  // ===== Сохранение =====

  toJSON() {
    const equipment = {};
    for (const [slot, item] of Object.entries(this.equipment)) {
      equipment[slot] = item ? item.toJSON() : null;
    }

    return {
      name: this.name,
      raceId: this.race.id,
      strength: this.strength,
      agility: this.agility,
      vitality: this.vitality,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      freeStatPoints: this.freeStatPoints,
      worldTimeMinutes: this.worldTimeMinutes,
      inventory: this.inventory.toJSON(),
      chest: this.chest.toJSON(),
      equipment,
      buffs: this.buffs.map(b => ({ ...b })),
      shopStock: this.shopStock.toJSON(),
      arenaLineup: this.arenaLineup.toJSON(),
      hp: this.hp,
      needs: { ...this.needs },
      location: this.location,
    };
  }

  static fromJSON(data) {
    return new Player(data);
  }
}
