/**
 * ОКНО СНА
 * --------
 * Пока герой спит: шкала сна постепенно наполняется И действует
 * тот же ускоренный реген HP, что и при отдыхе. Чтобы сон не
 * заменял отдых полностью, спать с полной шкалой сна нельзя.
 */
class SleepModal extends ActionModal {

  constructor(game) {
    super(game);
    this.completed = false;
  }

  get actionName() {
    return 'sleep';
  }

  get panelClass() {
    return 'sleep-modal';
  }

  get title() {
    return `${Hud.icon('bed')} Сон`;
  }

  get closeLabel() {
    return this.completed ? 'Встати' : 'Прокинутися зараз';
  }

  open() {
    this.completed = false;
    super.open();
  }

  canStart() {
    const player = this.game.player;

    if (Needs.isFixed(player)) {
      this.game.toast('Нежить не потребує сну.');
      return false;
    }
    if (player.needs.sleep >= BALANCE.needs.max) {
      this.game.toast('Герой зовсім не хоче спати!');
      return false;
    }
    return true;
  }

  contentHtml() {
    const player = this.game.player;
    const recoveryDivisor = player.recoveryDivisor;
    const sleepPerTick = BALANCE.rest.sleepPerTick / recoveryDivisor;
    const hpPerTick = Math.max(1, Math.round(
      player.maxHp * BALANCE.regen.percentPerTick * BALANCE.rest.sleepMultiplier
    )) / recoveryDivisor;
    const intro = this.completed
      ? 'Герой виспався і готовий продовжити шлях.'
      : 'Відновлення триває, доки герой спить.';
    const sleepRate = this.completed
      ? 'Повністю відновлено'
      : this.recoveryRateText(sleepPerTick);
    const healthRate = this.completed
      ? (player.hp >= player.maxHp ? 'Повністю відновлено' : 'Сон завершено')
      : this.recoveryRateText(hpPerTick, ' HP');
    const tickStatus = this.completed
      ? 'Відновлення сну завершено'
      : `Відновлення кожні ${BALANCE.regen.intervalMs / 1000} с`;

    return `
      <p class="sleep-modal__intro">${intro}</p>
      <div class="sleep-modal__statuses">
        ${this.statusCard({
          kind: 'sleep',
          icon: 'sleep',
          label: 'Сон',
          value: player.needs.sleep,
          max: BALANCE.needs.max,
          rate: sleepRate,
        })}
        ${this.statusCard({
          kind: 'health',
          icon: 'hp',
          label: "Здоров'я",
          value: player.hp,
          max: player.maxHp,
          rate: healthRate,
        })}
      </div>
      <div class="sleep-modal__tick">
        <span class="sleep-modal__pulse${this.completed ? ' sleep-modal__pulse--complete' : ''}" aria-hidden="true"></span>
        ${tickStatus}
      </div>
    `;
  }

  statusCard({ kind, icon, label, value, max, rate }) {
    return `
      <section class="sleep-status sleep-status--${kind}">
        <div class="sleep-status__heading">
          <span>${Hud.icon(icon)} ${label}</span>
          <b>${value} / ${max}</b>
        </div>
        ${this.progressBar(kind, value, max)}
        <small>${rate}</small>
      </section>
    `;
  }

  recoveryRateText(value, unit = '') {
    if (value >= 1) return `+${Math.round(value)}${unit} за тік у середньому`;

    const ticksPerUnit = Math.max(1, Math.round(1 / value));
    return `+1${unit} кожні ${ticksPerUnit} тіки`;
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
