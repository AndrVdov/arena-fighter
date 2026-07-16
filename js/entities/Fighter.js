/**
 * БОЕЦ
 * ----
 * Общие правила игрока и противника: экипировка, временные баффы и производные
 * боевые характеристики. Конкретные классы отвечают только за свои особенности.
 */
class Fighter {

  static BUFF_STATS = ['strength', 'agility', 'vitality'];

  /** Оставить только последний действующий эликсир для каждой характеристики. */
  static normalizeBuffs(buffs = []) {
    const buffsByStat = new Map();

    for (const buff of buffs) {
      if (!Fighter.BUFF_STATS.includes(buff?.stat)) continue;
      const value = Number(buff.value);
      const fightsLeft = Math.floor(Number(buff.fightsLeft ?? buff.fights));
      if (!Number.isFinite(value) || value <= 0 || fightsLeft <= 0) continue;

      buffsByStat.delete(buff.stat);
      buffsByStat.set(buff.stat, { stat: buff.stat, value, fightsLeft });
    }
    return [...buffsByStat.values()];
  }

  static healthConditionFor(hp, maxHp) {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    const conditions = BALANCE.healthConditions;

    if (ratio < conditions.nearDeath.threshold) {
      return { id: 'nearDeath', ...conditions.nearDeath };
    }
    if (ratio < conditions.wounded.threshold) {
      return { id: 'wounded', ...conditions.wounded };
    }
    return null;
  }

  static applyRaceModifier(value, race, stat) {
    const modifier = race?.statModifiers?.[stat] ?? 0;
    return Math.max(1, Math.round(value * (1 + modifier)));
  }

  static raceTraitParts(race) {
    const labels = {
      strength: 'Сили',
      agility: 'Спритності',
      vitality: 'Життя',
    };
    const parts = [];
    for (const stat of ['strength', 'agility', 'vitality']) {
      const modifier = race?.statModifiers?.[stat] ?? 0;
      if (modifier === 0) continue;
      const percent = Math.round(Math.abs(modifier) * 100);
      parts.push(`${modifier > 0 ? '+' : '−'}${percent}% до ${labels[stat]}`);
    }
    return parts;
  }

  static raceTraitText(race) {
    const parts = Fighter.raceTraitParts(race);
    if (race?.traitText) parts.push(race.traitText);
    return parts.length ? parts.join(', ') : 'без модифікаторів';
  }

  racialBaseStat(stat) {
    return Fighter.applyRaceModifier(this[stat], this.race, stat);
  }

  equipmentBonus(aspect) {
    return Object.values(this.equipment).filter(Boolean)
      .reduce((sum, item) => sum + (item.bonuses[aspect] ?? 0), 0);
  }

  buffValue(stat) {
    return this.buffs.find(buff => buff.stat === stat)?.value ?? 0;
  }

  addBuff(stat, value, fights) {
    const [newBuff] = Fighter.normalizeBuffs([{ stat, value, fightsLeft: fights }]);
    if (!newBuff) return false;

    const previousMaxHp = Number.isFinite(this.hp) ? this.maxHp : null;
    const wasAtFullHealth = previousMaxHp !== null && this.hp >= previousMaxHp;
    this.buffs = this.buffs.filter(buff => buff.stat !== stat);
    this.buffs.push(newBuff);

    if (previousMaxHp !== null) {
      if (wasAtFullHealth && this.maxHp > previousMaxHp) {
        this.hp += this.maxHp - previousMaxHp;
      }
      this.clampHp();
    }
    return true;
  }

  spendBuffCharges() {
    this.buffs.forEach(buff => buff.fightsLeft--);
    this.buffs = this.buffs.filter(buff => buff.fightsLeft > 0);
    if (Number.isFinite(this.hp)) this.clampHp();
  }

  statWithGear(stat) {
    return this.racialBaseStat(stat) + this.equipmentBonus(stat) + this.buffValue(stat);
  }

  get effectiveStrength() { return this.statWithGear('strength'); }
  get effectiveAgility() { return this.statWithGear('agility'); }
  get effectiveVitality() { return this.statWithGear('vitality'); }

  get maxHp() {
    return BALANCE.player.baseHp
      + this.effectiveVitality * BALANCE.player.hpPerVitality;
  }

  get baseAttackDamage() {
    return Math.round(BALANCE.combat.baseDamage
      + this.effectiveStrength * BALANCE.combat.damagePerStrength
      + this.equipmentBonus('damage'));
  }

  get attackDamage() {
    return Math.max(1, Math.round(this.baseAttackDamage * this.damageMultiplier));
  }

  get healthCondition() {
    return Fighter.healthConditionFor(this.hp, this.maxHp);
  }

  get damageMultiplier() {
    return this.healthCondition?.damageMultiplier ?? 1;
  }

  get recoveryDivisor() {
    return this.healthCondition?.recoveryDivisor ?? 1;
  }

  get travelMultiplier() {
    return this.healthCondition?.travelMultiplier ?? 1;
  }

  get armor() { return this.equipmentBonus('armor'); }
  get shieldBlockArmor() { return this.equipmentBonus('blockArmor'); }
  get shieldBlockChance() { return this.equipmentBonus('blockChance') / 100; }

  /** Целое восстановление с накоплением дробной части между тиками. */
  recoveryAmount(baseAmount, channel = 'hp') {
    this._recoveryProgress ??= {};
    const total = (this._recoveryProgress[channel] ?? 0)
      + baseAmount / this.recoveryDivisor;
    const amount = Math.floor(total + Number.EPSILON);
    this._recoveryProgress[channel] = total - amount;
    return amount;
  }

  clearRecoveryProgress(channel) {
    if (this._recoveryProgress) this._recoveryProgress[channel] = 0;
  }

  clampHp() {
    this.hp = Math.min(this.hp, this.maxHp);
  }

  /** Снять и передать всё надетое снаряжение в указанный инвентарь. */
  drainEquipmentTo(targetInventory) {
    const transferred = [];
    for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
      const item = this.equipment[slot];
      if (!item) continue;
      this.equipment[slot] = null;
      targetInventory.add(item);
      transferred.push(item);
    }
    this.clampHp();
    return transferred;
  }
}
