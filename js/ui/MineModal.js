/** Окно длительной работы в шахте. */
class MineModal extends ActionModal {

  constructor(game) {
    super(game);
    this.earnedGold = 0;
  }

  get actionName() {
    return 'mine';
  }

  get title() {
    return '⛏️ Робота в шахті';
  }

  get closeLabel() {
    return 'Завершити роботу';
  }

  canStart() {
    if (this.game.player.healthCondition) {
      this.game.toast('Поранений герой не може працювати в шахті. Спочатку відновіть здоров\'я.');
      return false;
    }
    if (this.game.player.needs.sleep <= 0) {
      this.game.toast('Герой надто виснажений для роботи в шахті.');
      return false;
    }
    return true;
  }

  open() {
    this.earnedGold = 0;
    super.open();
  }

  recordEarnings(amount) {
    this.earnedGold += amount;
  }

  contentHtml() {
    const player = this.game.player;
    const income = Mining.incomePerTick(player);
    const intervalSeconds = BALANCE.regen.intervalMs / 1000;
    const goldChance = Math.round(BALANCE.mining.goldChancePerTick * 100);

    return `
      <p class="action-modal__text">
        Герой працює в шахті. Заробіток надходить кожні ${intervalSeconds} с,
        доки це вікно відкрите.
      </p>
      <div class="mine-work__total"><span>Зароблено</span><b>🪙 ${this.earnedGold}</b></div>
      <div class="mine-work__rate"><span>Золота за знахідку</span><b>+${income}</b></div>
      <div class="mine-work__chance"><span>Шанс знайти золото</span><b>${goldChance}% за тік</b></div>
      <div class="mine-work__cost">
        <span>Втома за тік</span>
        <b>−${BALANCE.mining.sleepCostPerTick} сну · ${player.needs.sleep}/${BALANCE.needs.max}</b>
      </div>
      <p class="action-modal__hint">
        ${BALANCE.mining.baseGoldPerTick} базове золото + 1 золото
        за кожні ${BALANCE.mining.strengthPerBonusGold} діючої Сили.
        Поточна Сила: ${player.effectiveStrength}.
      </p>
    `;
  }
}
