/**
 * ОКНО СНА
 * --------
 * Пока герой спит: шкала сна постепенно наполняется И действует
 * тот же ускоренный реген HP, что и при отдыхе. Чтобы сон не
 * заменял отдых полностью, спать с полной шкалой сна нельзя.
 */
class SleepModal extends ActionModal {

  get actionName() {
    return 'sleep';
  }

  get title() {
    return '🛏️ Сон';
  }

  get closeLabel() {
    return 'Прокинутись';
  }

  canStart() {
    const player = this.game.player;

    if (player.needs.sleep >= BALANCE.needs.max) {
      this.game.toast('Герой зовсім не хоче спати!');
      return false;
    }
    return true;
  }

  contentHtml() {
    const player = this.game.player;

    return `
      <p class="action-modal__text">
        Герой солодко спить. Сон поповнюється,
        а HP відновлюється ×${BALANCE.rest.sleepMultiplier} швидше.
      </p>
      <div class="action-modal__row">🌙 Сон</div>
      ${this.progressBar('sleep', player.needs.sleep, BALANCE.needs.max)}
      <div class="action-modal__row">❤️ Здоров'я</div>
      ${this.progressBar('hp', player.hp, player.maxHp)}
      <p class="action-modal__hint">Закрий вікно, щоб розбудити героя.</p>
    `;
  }
}
