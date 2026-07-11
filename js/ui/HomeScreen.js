/**
 * ЭКРАН ДОМА
 * ----------
 * Дом игрока: экран персонажа, инвентарь, сундук, отдых и сон.
 * Дома HP восстанавливается быстрее (см. Game/regen).
 */
class HomeScreen extends LocationScreen {

  get locationId() {
    return 'home';
  }

  render(container) {
    const home = this.location;

    container.innerHTML = `
      ${this.banner(home.name, home.subtitle)}

      <div class="home-hotspots" aria-label="Дії вдома">
        ${this.hotspot('storage', 'chest', 'Скриня')}
        ${this.hotspot('rest', 'rest', 'Відпочити')}
        ${this.hotspot('sleep', 'bed', 'Спати')}
      </div>

      <div class="home-mobile-actions" aria-label="Дії вдома">
        ${this.mobileAction('storage', 'chest', 'Скриня')}
        ${this.mobileAction('rest', 'rest', 'Відпочити')}
        ${this.mobileAction('sleep', 'bed', 'Спати')}
      </div>
    `;

    container.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => this.handleAction(button.dataset.action));
    });
  }

  hotspot(action, icon, label) {
    return `
      <button class="home-hotspot home-hotspot--${action}" data-action="${action}" aria-label="${label}">
        <span class="home-hotspot__marker">${Hud.icon(icon)}</span>
        <span class="home-hotspot__label">${label}</span>
      </button>
    `;
  }

  mobileAction(action, icon, label) {
    return `
      <button class="home-mobile-action" data-action="${action}">
        ${Hud.icon(icon)}<span>${label}</span>
      </button>
    `;
  }

  handleAction(action) {
    switch (action) {
      case 'storage': this.game.showScreen('storage');   break;
      case 'rest':    this.game.modals.rest.open();      break;
      case 'sleep':   this.game.modals.sleep.open();     break;
    }
  }
}
