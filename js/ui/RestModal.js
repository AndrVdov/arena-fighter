/**
 * ОКНО ОТДЫХА
 * -----------
 * Пока герой отдыхает у костра, HP восстанавливается
 * в BALANCE.rest.restMultiplier раз быстрее. Больше отдых
 * ничего не даёт; закрытие окна прерывает его.
 */
class RestModal extends ActionModal {

  constructor(game) {
    super(game);
    this.completed = false;
  }

  get actionName() {
    return 'rest';
  }

  get panelClass() {
    return 'rest-modal';
  }

  get title() {
    const label = this.completed ? 'Герой відпочив' : 'Відпочинок';
    return `${Hud.icon('rest')} ${label}`;
  }

  get closeLabel() {
    return this.completed ? 'Встати' : 'Перервати відпочинок';
  }

  open() {
    this.completed = false;
    super.open();
  }

  canStart() {
    const player = this.game.player;

    if (player.hp >= player.maxHp) {
      this.game.toast('Герой і так повний сил!');
      return false;
    }
    return true;
  }

  contentHtml() {
    const player = this.game.player;
    const condition = player.healthCondition;
    const baseRate = Math.max(1, Math.round(
      player.maxHp * BALANCE.regen.percentPerTick * BALANCE.rest.restMultiplier
    ));
    const recoveryRate = baseRate / player.recoveryDivisor;
    const intro = this.completed
      ? 'Герой повністю відновив здоров’я і готовий продовжити шлях.'
      : 'Герой відновлює сили біля вогнища.';
    const rate = this.completed
      ? 'Повністю відновлено'
      : this.recoveryRateText(recoveryRate, ' HP');
    const tickStatus = this.completed
      ? 'Відновлення завершено'
      : `Відновлення кожні ${BALANCE.regen.intervalMs / 1000} с`;

    return `
      <p class="rest-modal__intro">${intro}</p>
      <section class="rest-status">
        <div class="rest-status__heading">
          <span>${Hud.icon('hp')} Здоров’я</span>
          <b>${player.hp} / ${player.maxHp}</b>
        </div>
        ${this.progressBar('health', player.hp, player.maxHp)}
        <div class="rest-status__details">
          <small>${rate}</small>
          <span>Відпочинок ×${BALANCE.rest.restMultiplier}</span>
        </div>
      </section>
      ${this.conditionHtml(condition)}
      <div class="rest-modal__tick">
        <span class="rest-modal__pulse${this.completed ? ' rest-modal__pulse--complete' : ''}" aria-hidden="true"></span>
        ${tickStatus}
      </div>
    `;
  }

  conditionHtml(condition) {
    if (!condition) {
      return `
        <div class="rest-modal__condition rest-modal__condition--clear">
          ${Hud.icon('hp')} <span>Без штрафів до відновлення</span>
        </div>
      `;
    }

    const nearDeath = condition.id === 'nearDeath';
    const label = nearDeath ? 'При смерті' : 'Поранений';
    const icon = nearDeath ? 'nearDeath' : 'wounded';
    return `
      <div class="rest-modal__condition rest-modal__condition--debuff">
        ${Hud.icon(icon)}
        <span>${label} · відновлення ÷${condition.recoveryDivisor}</span>
      </div>
    `;
  }

  complete() {
    if (this.game.activeAction !== this.actionName) return;

    this.game.activeAction = null;
    this.game.audio.setAction(null);
    this.completed = true;
    this.game.effectsBar.render();
    this.game.save();
    this.refresh();
  }
}
