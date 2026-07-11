/**
 * ОКНО ОТДЫХА
 * -----------
 * Пока герой отдыхает у костра, HP восстанавливается
 * в BALANCE.rest.restMultiplier раз быстрее. Больше отдых
 * ничего не даёт; закрытие окна прерывает его.
 */
class RestModal extends ActionModal {

  get actionName() {
    return 'rest';
  }

  get title() {
    return '🔥 Відпочинок';
  }

  get closeLabel() {
    return 'Встати';
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

    return `
      <p class="action-modal__text">
        Герой відпочиває біля вогнища.
        Відновлення HP прискорено ×${BALANCE.rest.restMultiplier}.
      </p>
      ${this.progressBar('hp', player.hp, player.maxHp)}
      <p class="action-modal__hint">Закрий вікно, щоб перервати відпочинок.</p>
    `;
  }
}
