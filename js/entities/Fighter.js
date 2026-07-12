/**
 * БОЕЦ
 * ----
 * Общие правила игрока и противника: экипировка, временные баффы и производные
 * боевые характеристики. Конкретные классы отвечают только за свои особенности.
 */
class Fighter {

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
    return this.buffs.filter(buff => buff.stat === stat)
      .reduce((sum, buff) => sum + buff.value, 0);
  }

  addBuff(stat, value, fights) {
    this.buffs.push({ stat, value, fightsLeft: fights });
  }

  spendBuffCharges() {
    this.buffs.forEach(buff => buff.fightsLeft--);
    this.buffs = this.buffs.filter(buff => buff.fightsLeft > 0);
  }

  statWithGear(stat) {
    return this.racialBaseStat(stat) + this.equipmentBonus(stat) + this.buffValue(stat);
  }

  get effectiveStrength() { return this.statWithGear('strength'); }
  get effectiveAgility() { return this.statWithGear('agility'); }
  get effectiveVitality() { return this.statWithGear('vitality'); }

  get maxHp() {
    return BALANCE.player.baseHp
      + this.effectiveVitality * BALANCE.player.hpPerVitality
      + this.equipmentBonus('maxHp');
  }

  get attackDamage() {
    return Math.round(BALANCE.combat.baseDamage
      + this.effectiveStrength * BALANCE.combat.damagePerStrength
      + this.equipmentBonus('damage'));
  }

  get dodgeExtra() { return this.equipmentBonus('dodge'); }

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
