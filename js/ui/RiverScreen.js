/**
 * ЭКРАН РЕКИ
 * -----------
 * Безопасная природная локация: обычный отдых и бесплатное
 * восстановление шкалы жажды чистой речной водой.
 */
class RiverScreen extends LocationScreen {

  get locationId() {
    return 'river';
  }

  render(container) {
    const river = this.location;
    container.innerHTML = `
      ${this.banner(river.name, river.subtitle)}

      <div class="river-actions" aria-label="Дії біля річки">
        ${this.action('rest', 'rest', 'Відпочити', 'Відновлювати здоров’я швидше')}
        ${this.action('drink', 'thirst', 'Напитися води', 'Повністю втамувати спрагу')}
      </div>
    `;

    container.querySelectorAll('[data-river-action]').forEach(button => {
      button.addEventListener('click', () => this.handleAction(button.dataset.riverAction));
    });
  }

  action(action, icon, title, description) {
    return `
      <button class="river-action river-action--${action}" data-river-action="${action}">
        <span class="river-action__icon">${Hud.icon(icon)}</span>
        <span><b>${title}</b><small>${description}</small></span>
      </button>
    `;
  }

  handleAction(action) {
    if (action === 'rest') {
      this.game.modals.rest.open();
      return;
    }
    if (action !== 'drink') return;

    const player = this.game.player;
    if (player.needs.thirst >= BALANCE.needs.max) {
      this.game.toast('Ти вже не відчуваєш спраги.');
      return;
    }

    player.needs.thirst = BALANCE.needs.max;
    this.game.refresh();
    this.game.toast('Ти напився чистої річкової води.');
  }
}
