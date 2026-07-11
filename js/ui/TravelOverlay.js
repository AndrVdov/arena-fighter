/**
 * ПУТЕШЕСТВИЕ
 * ------------
 * Короткий переход между физическими локациями. До завершения это только
 * визуальный процесс: местоположение, игровое время и потребности меняются
 * одним пакетом в callback после окончания анимации.
 */
class TravelOverlay {

  constructor(game) {
    this.game = game;
    this.overlay = null;
    this.timer = null;
    this.backgroundElements = [];
  }

  start(origin, destination, onArrival) {
    if (this.overlay) return false;

    const cfg = BALANCE.travel;
    this.backgroundElements = [
      document.getElementById('screen'),
      document.getElementById('hud-wrap'),
      document.getElementById('map-button'),
      document.getElementById('menu-button'),
    ].filter(Boolean);
    this.backgroundElements.forEach(element => { element.inert = true; });

    this.overlay = document.createElement('div');
    this.overlay.className = 'travel-overlay';
    this.overlay.style.setProperty('--travel-duration', `${cfg.durationMs}ms`);
    this.overlay.innerHTML = `
      <section class="travel-panel" role="dialog" aria-modal="true" aria-labelledby="travel-title">
        <span class="travel-panel__eyebrow">В дорозі</span>
        <h1 id="travel-title">${origin.name} <span>→</span> ${destination.name}</h1>

        <div class="travel-route" aria-hidden="true">
          <span class="travel-route__point">${Hud.icon(origin.uiIcon)}</span>
          <span class="travel-route__line"><i></i></span>
          <span class="travel-route__traveler">◆</span>
          <span class="travel-route__point">${Hud.icon(destination.uiIcon)}</span>
        </div>

        <p>Час у дорозі: ${cfg.gameMinutes} хвилин</p>
      </section>
    `;

    document.body.appendChild(this.overlay);
    document.body.classList.add('travel-open');
    this.game.isTraveling = true;

    this.timer = setTimeout(() => {
      this.finish();
      onArrival();
    }, cfg.durationMs);
    return true;
  }

  finish() {
    clearTimeout(this.timer);
    this.timer = null;
    this.backgroundElements.forEach(element => { element.inert = false; });
    this.backgroundElements = [];
    this.overlay?.remove();
    this.overlay = null;
    document.body.classList.remove('travel-open');
    this.game.isTraveling = false;
  }
}
