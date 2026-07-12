/**
 * ПАНЕЛЬ АКТИВНЫХ ЭФФЕКТОВ
 * ------------------------
 * Ряд иконок-медальонов справа от HUD: эликсиры и эффекты
 * потребностей. Зелёная рамка — бафф, красная — дебафф.
 * При наведении — подсказка с точными цифрами.
 */
class EffectsBar {

  constructor(rootElement, game) {
    this.root = rootElement;
    this.game = game;
  }

  render() {
    this.root.innerHTML = EffectsBar.collectPlayerEffects(this.game.player, this.game)
      .map(effect => `
        <div class="effect-icon effect-icon--${effect.type}" title="${effect.hint}">
          ${Hud.icon(effect.icon)}
        </div>
      `)
      .join('');
  }

  /** Собрать все действующие эффекты героя. */
  collectEffects() {
    return EffectsBar.collectPlayerEffects(this.game.player, this.game);
  }

  /** Эффекты героя для HUD и увеличенного боевого представления. */
  static collectPlayerEffects(player, game = null) {
    const effects = EffectsBar.collectRaceEffects(player);

    // Длительное действие: отдых или сон ускоряют реген HP
    if (game?.activeAction === 'rest') {
      effects.push({
        type: 'buff',
        icon: 'rest',
        text: `Відпочинок ×${BALANCE.rest.restMultiplier}`,
        hint: `Відпочинок: відновлення HP ×${BALANCE.rest.restMultiplier}`,
      });
    } else if (game?.activeAction === 'sleep') {
      effects.push({
        type: 'buff',
        icon: 'bed',
        text: `Сон ×${BALANCE.rest.sleepMultiplier}`,
        hint: `Сон: відновлення HP ×${BALANCE.rest.sleepMultiplier}, сон поповнюється`,
      });
    }

    // Эликсиры (действуют несколько боёв)
    effects.push(...EffectsBar.collectBuffEffects(player));

    effects.push(...EffectsBar.collectNeedEffects(player));

    return effects;
  }

  /** Баффы и штрафы потребностей подходят и игроку, и противнику. */
  static collectNeedEffects(fighter) {
    const effects = [];
    for (const need of Object.keys(Needs.LABELS)) {
      const { info, bonus } = Needs.effectFor(fighter, need);

      if (bonus > 0) {
        effects.push({
          type: 'buff',
          icon: need,
          text: `${info.fullLabel}: +${bonus} до ${info.statName}`,
          hint: `${info.fullLabel}: +${bonus} до ${info.statName}`,
        });
      } else if (bonus < 0) {
        effects.push({
          type: 'debuff',
          icon: need,
          text: `${info.emptyLabel}: −${Math.abs(bonus)} до ${info.statName}`,
          hint: `${info.emptyLabel}: −${Math.abs(bonus)} до ${info.statName}`,
        });
      }
    }
    return effects;
  }

  static collectEnemyEffects(enemy) {
    return [
      ...EffectsBar.collectRaceEffects(enemy),
      ...EffectsBar.collectBuffEffects(enemy),
      ...EffectsBar.collectNeedEffects(enemy),
    ];
  }

  static collectRaceEffects(fighter) {
    const race = fighter.race;
    return [{
      type: 'neutral',
      icon: 'race',
      text: `${race.name}: ${Fighter.raceTraitText(race)}`,
      hint: `Расова особливість «${race.name}»: ${Fighter.raceTraitText(race)}`,
    }];
  }

  static collectBuffEffects(fighter) {
    return fighter.buffs.map(buff => ({
      type: 'buff',
      icon: 'elixir',
      text: `${ASPECTS[buff.stat].format(buff.value)} · ${buff.fightsLeft} боїв`,
      hint: `Еліксир: ${ASPECTS[buff.stat].format(buff.value)} (ще боїв: ${buff.fightsLeft})`,
    }));
  }
}
