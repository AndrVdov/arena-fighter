/** Экран шахты с единственным длительным действием работы. */
class MineScreen extends LocationScreen {

  get locationId() {
    return 'mine';
  }

  render(container) {
    const mine = this.location;
    container.innerHTML = `
      ${this.banner(mine.name, mine.subtitle)}
      <button class="mine-action" data-mine-action="work">
        <span>${Hud.icon('mine')}</span>
        <b>Працювати в шахті</b>
        <small>Заробіток залежить від діючої Сили</small>
      </button>
    `;

    container.querySelector('[data-mine-action="work"]')
      .addEventListener('click', () => this.game.modals.mine.open());
  }
}
