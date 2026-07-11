/**
 * БОЕВАЯ СИСТЕМА
 * --------------
 * Полностью автоматический бой 1 на 1. Бой просчитывается сразу
 * и возвращает список событий — интерфейс проигрывает их с паузами.
 *
 * Формулы (см. BALANCE.combat):
 *  - шанс крита растёт с разницей Ловкости атакующего и цели;
 *  - шанс уворота растёт с разницей Ловкости защищающегося и атакующего;
 *  - крит наносит удвоенный урон.
 */
class Combat {

  /**
   * Просчитать бой игрока с противником.
   * @returns {{ events: Array, playerWon: boolean, playerHpLeft: number }}
   */
  static simulate(player, enemy, openingEvents = []) {
    const a = Combat.fighterFromPlayer(player);
    const b = Combat.fighterFromEnemy(enemy);
    const events = [];

    events.push(...openingEvents);
    events.push({ type: 'info', text: `⚔️ Бій починається: ${a.name} проти ${b.name}!` });

    // Первым бьёт более ловкий (при равенстве — игрок)
    let [attacker, defender] = a.agility >= b.agility ? [a, b] : [b, a];

    // Предохранитель от бесконечного боя (урон всегда > 0, так что не сработает)
    for (let turn = 0; turn < 200; turn++) {
      events.push(Combat.strike(attacker, defender));

      if (defender.hp <= 0) {
        events.push({
          type: 'info',
          text: `🏆 ${attacker.name} перемагає!`,
        });
        break;
      }
      [attacker, defender] = [defender, attacker];
    }

    return {
      events,
      playerWon: b.hp <= 0,
      playerHpLeft: a.hp,
      enemyHpLeft: b.hp,
    };
  }

  /** Один удар: уворот, крит или обычное попадание. */
  static strike(attacker, defender) {
    const cfg = BALANCE.combat;
    const attackName = Drops.randomOf(ATTACK_NAMES);

    // Уворот: ловкость защищающегося против ловкости атакующего
    const dodgeChance = Combat.chance(
      cfg.dodgeBase + (defender.agility - attacker.agility) * cfg.dodgePerAgility
        + defender.dodgeExtra / 100,
      cfg.dodgeMin, cfg.dodgeMax
    );

    if (Math.random() < dodgeChance) {
      return {
        type: 'dodge',
        defenderSide: defender.side,
        text: `💨 ${defender.name} ухиляється від удару «${attackName}»!`,
      };
    }

    // Урон с разбросом
    const spread = 1 + (Math.random() * 2 - 1) * cfg.variance;
    let damage = Math.max(1, Math.round(attacker.attackDamage * spread));

    // Крит: ловкость атакующего против ловкости цели
    const critChance = Combat.chance(
      cfg.critBase + (attacker.agility - defender.agility) * cfg.critPerAgility,
      cfg.critMin, cfg.critMax
    );
    const isCrit = Math.random() < critChance;
    if (isCrit) damage *= cfg.critMultiplier;

    defender.hp = Math.max(0, defender.hp - damage);

    return {
      type: isCrit ? 'crit' : 'hit',
      defenderSide: defender.side,
      defenderHp: defender.hp,
      text: isCrit
        ? `💥 КРИТ! ${attacker.name} — «${attackName}» ×2: ${damage} урону!`
        : `${attacker.icon} ${attacker.name} завдає удару «${attackName}» — ${damage} урону.`,
    };
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
      attackDamage: player.attackDamage,
      agility: player.effectiveAgility,
      dodgeExtra: player.dodgeExtra,
    };
  }

  static fighterFromEnemy(enemy) {
    return {
      side: 'enemy',
      name: enemy.title,
      icon: enemy.race.icon,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      attackDamage: enemy.attackDamage,
      agility: enemy.effectiveAgility,
      dodgeExtra: enemy.dodgeExtra,
    };
  }
}
