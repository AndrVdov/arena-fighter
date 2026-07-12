/**
 * ПОТРЕБНОСТИ
 * -----------
 * Каждая шкала влияет на свою характеристику — просто и наглядно:
 *   🍗 Голод  → Сила      (сытый +10%, голодный −10%)
 *   💧 Жажда  → Ловкость  (напоённый +10%, жаждущий −10%)
 *   🌙 Сон    → Жизнь     (выспавшийся +10%, невыспавшийся −10%)
 *
 * Бонус считается от характеристики с учётом экипировки и эликсиров,
 * минимум 1. Пороги и процент — в BALANCE.needs.
 */
class Needs {

  /** Описание шкал: иконка, название и на какую характеристику влияет. */
  static LABELS = {
    hunger: {
      icon: '🍗', name: 'Голод',
      stat: 'strength', statName: 'Сили',
      fullLabel: 'Ситий', emptyLabel: 'Голодний',
    },
    thirst: {
      icon: '💧', name: 'Спрага',
      stat: 'agility', statName: 'Спритності',
      fullLabel: 'Напоєний', emptyLabel: 'Спраглий',
    },
    sleep: {
      icon: '🌙', name: 'Сон',
      stat: 'vitality', statName: 'Життя',
      fullLabel: 'Виспаний', emptyLabel: 'Невиспаний',
    },
  };

  /** Привести сохранённые шкалы к полному безопасному набору 0..max. */
  static normalize(values = {}, fallback = BALANCE.needs.start) {
    const normalized = {};
    for (const need of Object.keys(Needs.LABELS)) {
      const value = Number(values?.[need]);
      normalized[need] = Number.isFinite(value)
        ? Math.min(BALANCE.needs.max, Math.max(0, value))
        : fallback;
    }
    return normalized;
  }

  /**
   * Бонус шкалы к её характеристике: ±10% от значения характеристики
   * (минимум 1, чтобы эффект был заметен и на старте).
   * @param {number} statValue — характеристика с экипировкой и эликсирами
   */
  static bonusFor(player, need, statValue) {
    const cfg = BALANCE.needs;
    const value = player.needs[need];
    const size = Math.max(1, Math.round(statValue * cfg.bonusPercent));

    if (value >= cfg.buffAbove) return size;
    if (value <= cfg.debuffBelow) return -size;
    return 0;
  }

  /** Точное состояние шкалы и её текущий модификатор характеристики. */
  static effectFor(fighter, need) {
    const info = Needs.LABELS[need];
    const bonus = Needs.bonusFor(fighter, need, fighter.statWithGear(info.stat));
    return {
      info,
      bonus,
      state: bonus > 0 ? 'high' : bonus < 0 ? 'low' : 'normal',
    };
  }

  /** Расход потребностей за один бой на арене. */
  static spendForFight(player) {
    Needs.spend(player, BALANCE.needs.costPerFight);
  }

  static spend(player, cost) {
    for (const [need, amount] of Object.entries(cost)) {
      player.needs[need] = Math.max(0, player.needs[need] - amount);
    }
    // Сон влияет на Жизнь → макс. HP мог упасть; не даём текущему HP его превышать
    player.clampHp();
  }

  /** Список активных эффектов с явным описанием, что даёт каждая шкала. */
  static statusLines(player) {
    const lines = [];

    for (const need of Object.keys(Needs.LABELS)) {
      const { info, bonus } = Needs.effectFor(player, need);

      if (bonus > 0) {
        lines.push({ type: 'buff', text: `${info.icon} ${info.fullLabel}: +${bonus} до ${info.statName}` });
      } else if (bonus < 0) {
        lines.push({ type: 'debuff', text: `${info.icon} ${info.emptyLabel}: −${Math.abs(bonus)} до ${info.statName}` });
      }
    }
    return lines;
  }
}
