/**
 * БОЕВАЯ СИСТЕМА
 * --------------
 * Полностью автоматический бой 1 на 1. Бой просчитывается сразу
 * и возвращает список событий — интерфейс проигрывает их с паузами.
 *
 * Формулы (см. BALANCE.combat):
 *  - шанс крита растёт с разницей Ловкости атакующего и цели;
 *  - шанс уворота растёт с разницей Ловкости защищающегося и атакующего;
 *  - постоянная броня уменьшает каждый полученный удар;
 *  - щит с отдельным шансом дополнительно поглощает урон при блоке;
 *  - крит наносит удвоенный урон до применения защиты.
 */
class Combat {

  static MODES = {
    training: { id: 'training', hpThreshold: 0.5 },
    lethal: { id: 'lethal', hpThreshold: 0 },
  };

  /**
   * Просчитать бой игрока с противником.
   * @returns {{ events: Array, playerWon: boolean, playerHpLeft: number }}
   */
  static simulate(player, enemy, openingEvents = [], modeId = 'lethal') {
    const a = Combat.fighterFromPlayer(player);
    const b = Combat.fighterFromEnemy(enemy);
    const events = [];
    const mode = Combat.MODES[modeId] ?? Combat.MODES.lethal;
    let loser = null;

    events.push(...openingEvents);
    events.push({
      type: 'info',
      text: `⚔️ ${mode.id === 'training' ? 'Тренувальний' : 'Смертельний'} бій починається: ${a.name} проти ${b.name}!`,
    });

    // Первым бьёт более ловкий (при равенстве — игрок)
    let [attacker, defender] = a.agility >= b.agility ? [a, b] : [b, a];

    // Предохранитель от бесконечного боя (урон всегда > 0, так что не сработает)
    for (let turn = 0; turn < 200; turn++) {
      events.push(Combat.strike(attacker, defender, mode.id === 'training' ? 1 : 0));

      if (defender.hp / defender.maxHp <= mode.hpThreshold) {
        loser = defender;
        events.push({
          type: 'info',
          text: mode.id === 'training'
            ? `🏳️ ${defender.name} опускається до половини здоров'я. ${attacker.name} перемагає!`
            : `🏆 ${attacker.name} перемагає!`,
        });
        break;
      }
      [attacker, defender] = [defender, attacker];
    }

    return {
      events,
      mode: mode.id,
      playerWon: loser?.side === 'enemy',
      playerHpLeft: a.hp,
      enemyHpLeft: b.hp,
    };
  }

  /** Один удар: уворот, крит или обычное попадание. */
  static strike(attacker, defender, minimumHp = 0, random = Math.random) {
    const cfg = BALANCE.combat;
    const attackName = Drops.randomOf(ATTACK_NAMES);

    // Уворот: ловкость защищающегося против ловкости атакующего
    const dodgeChance = Combat.chance(
      cfg.dodgeBase + (defender.agility - attacker.agility) * cfg.dodgePerAgility,
      cfg.dodgeMin, cfg.dodgeMax
    );

    if (random() < dodgeChance) {
      return {
        type: 'dodge',
        defenderSide: defender.side,
        text: `💨 ${defender.name} ухиляється від удару «${attackName}»!`,
      };
    }

    // Урон с разбросом
    const spread = 1 + (random() * 2 - 1) * cfg.variance;
    const damageMultiplier = Fighter.healthConditionFor(attacker.hp, attacker.maxHp)
      ?.damageMultiplier ?? 1;
    let rawDamage = Math.max(1, Math.round(
      attacker.baseAttackDamage * spread * damageMultiplier
    ));

    // Крит: ловкость атакующего против ловкости цели
    const critChance = Combat.chance(
      cfg.critBase + (attacker.agility - defender.agility) * cfg.critPerAgility,
      cfg.critMin, cfg.critMax
    );
    const isCrit = random() < critChance;
    if (isCrit) rawDamage *= cfg.critMultiplier;

    const defense = Combat.applyDefense(rawDamage, defender, random);
    let damage = defense.damage;

    const hpBeforeStrike = defender.hp;
    defender.hp = Math.max(minimumHp, defender.hp - damage);
    damage = hpBeforeStrike - defender.hp;

    return {
      type: defense.blocked ? 'block' : isCrit ? 'crit' : 'hit',
      defenderSide: defender.side,
      defenderHp: defender.hp,
      damage,
      rawDamage,
      armorAbsorbed: defense.armorAbsorbed,
      shieldAbsorbed: defense.shieldAbsorbed,
      text: Combat.strikeText({
        attacker, defender, attackName, damage, isCrit, ...defense,
      }),
    };
  }

  static applyDefense(rawDamage, defender, random = Math.random) {
    const armor = Math.max(0, defender.armor ?? 0);
    const afterArmor = Math.max(1, rawDamage - armor);
    const armorAbsorbed = rawDamage - afterArmor;
    const blockChance = Combat.chance(defender.shieldBlockChance ?? 0, 0, 1);
    const blocked = blockChance > 0 && random() < blockChance;
    const blockArmor = blocked ? Math.max(0, defender.shieldBlockArmor ?? 0) : 0;
    const damage = Math.max(1, afterArmor - blockArmor);

    return {
      damage,
      blocked,
      armorAbsorbed,
      shieldAbsorbed: afterArmor - damage,
    };
  }

  static strikeText({
    attacker, defender, attackName, damage, isCrit, blocked,
    armorAbsorbed, shieldAbsorbed,
  }) {
    const armorText = armorAbsorbed > 0 ? ` Броня поглинає ${armorAbsorbed}.` : '';
    if (blocked) {
      const armorPart = armorAbsorbed > 0 ? `броня поглинає ${armorAbsorbed}, ` : '';
      return `🛡️ БЛОК! ${defender.name} відбиває удар «${attackName}» щитом: `
        + `${armorPart}щит — ${shieldAbsorbed}; отримано ${damage} урону.`;
    }
    if (isCrit) {
      return `💥 КРИТ! ${attacker.name} — «${attackName}» ×2: ${damage} урону!${armorText}`;
    }
    return `${attacker.icon} ${attacker.name} завдає удару «${attackName}» — `
      + `${damage} урону.${armorText}`;
  }

  static chance(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** Боевой снимок игрока (бой не трогает игрока до применения результата). */
  static fighterFromPlayer(player) {
    return {
      side: 'player',
      name: player.name,
      icon: '🛡️',
      hp: player.hp,
      maxHp: player.maxHp,
      baseAttackDamage: player.baseAttackDamage,
      agility: player.effectiveAgility,
      armor: player.armor,
      shieldBlockChance: player.shieldBlockChance,
      shieldBlockArmor: player.shieldBlockArmor,
    };
  }

  static fighterFromEnemy(enemy) {
    return {
      side: 'enemy',
      name: enemy.title,
      icon: enemy.race.icon,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      baseAttackDamage: enemy.baseAttackDamage,
      agility: enemy.effectiveAgility,
      armor: enemy.armor,
      shieldBlockChance: enemy.shieldBlockChance,
      shieldBlockArmor: enemy.shieldBlockArmor,
    };
  }
}
