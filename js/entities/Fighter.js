/**
 * БОЕЦ
 * ----
 * Общие правила игрока и противника: экипировка, временные баффы и производные
 * боевые характеристики. Конкретные классы отвечают только за свои особенности.
 */
class Fighter {

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
    return this[stat] + this.equipmentBonus(stat) + this.buffValue(stat);
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
}
