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

    return `
      <p class="action-modal__text">
        Герой працює в шахті. Заробіток надходить кожні ${intervalSeconds} с,
        доки це вікно відкрите.
      </p>
      <div class="mine-work__total"><span>Зароблено</span><b>🪙 ${this.earnedGold}</b></div>
      <div class="mine-work__rate"><span>За один тік</span><b>+${income} золота</b></div>
      <p class="action-modal__hint">
        1 базова монета + 1 монета за кожні ${BALANCE.mining.strengthPerBonusGold} діючої Сили.
        Поточна Сила: ${player.effectiveStrength}.
      </p>
    `;
  }
}
