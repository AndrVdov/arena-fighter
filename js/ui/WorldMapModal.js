/**
 * ГЛОБАЛЬНАЯ КАРТА
 * ----------------
 * Полноэкранное окно путешествий поверх текущей локации. Карта не является
 * Screen: открытие и закрытие не меняют player.location и сохранённую сессию.
 */
class WorldMapModal extends Modal {

  open() {
    this.close();
    this.returnFocusElement = document.activeElement;
    this.backgroundElements = [
      document.getElementById('screen'),
      document.getElementById('hud-wrap'),
      document.getElementById('map-button'),
      document.getElementById('menu-button'),
    ].filter(Boolean);
    this.backgroundElements.forEach(element => { element.inert = true; });

    this.overlay = document.createElement('div');
    this.overlay.className = 'world-map-overlay';
    this.overlay.innerHTML = `
      <section class="world-map-modal" role="dialog" aria-modal="true"
               aria-labelledby="world-map-title">
        <button type="button" class="world-map-close" aria-label="Закрити мапу">×</button>

        <header class="world-map-heading">
          <span>Шляхи королівства</span>
          <h1 id="world-map-title">Глобальна мапа</h1>
        </header>

        <div class="world-map-scroll">
          <div class="world-map-board">
            ${Object.values(LOCATIONS).map(location => this.markerHtml(location)).join('')}
          </div>
        </div>
      </section>
    `;

    document.body.appendChild(this.overlay);
    document.body.classList.add('world-map-open');
    this.game.openModal = this;

    this.overlay.querySelector('.world-map-close').addEventListener('click', () => this.close());
    this.overlay.querySelectorAll('.world-map-marker').forEach(marker => {
      marker.addEventListener('click', () => this.game.travelTo(marker.dataset.location));
    });

    this.overlay.querySelector('.world-map-close').focus();
    this.centerTimer = setTimeout(() => this.centerCurrentLocation(), 100);
  }

  centerCurrentLocation() {
    const scroll = this.overlay?.querySelector('.world-map-scroll');
    const board = this.overlay?.querySelector('.world-map-board');
    const currentMarker = this.overlay?.querySelector('.world-map-marker--current');
    if (!scroll || !board || !currentMarker || scroll.scrollWidth <= scroll.clientWidth) return;

    const markerCenter = board.offsetLeft + currentMarker.offsetLeft;
    const target = markerCenter - scroll.clientWidth / 2;
    scroll.scrollLeft = Math.max(0, Math.min(target, scroll.scrollWidth - scroll.clientWidth));
  }

  markerHtml(location) {
    const isCurrent = this.game.player.location === location.id;
    const map = location.mapMarker;

    return `
      <button type="button"
              class="world-map-marker${isCurrent ? ' world-map-marker--current' : ''}"
              data-location="${location.id}"
              aria-label="Вирушити: ${location.name}. ${location.mapHint}"
              style="--map-x:${map.x}%; --map-y:${map.y}%; --marker-size:${map.size}%">
        ${isCurrent ? `
          <span class="world-map-hero" title="Герой зараз тут">
            <img src="${Hud.HERO_PORTRAIT}" alt="${this.game.player.name}">
          </span>
        ` : ''}
        <img class="world-map-marker__image" src="${map.image}" alt="">
        <span class="world-map-marker__label">${location.name}</span>
      </button>
    `;
  }

  close() {
    clearTimeout(this.centerTimer);
    this.centerTimer = null;
    const returnFocusElement = this.returnFocusElement;
    this.backgroundElements?.forEach(element => { element.inert = false; });
    this.backgroundElements = null;
    this.returnFocusElement = null;
    document.body.classList.remove('world-map-open');
    super.close();
    if (returnFocusElement?.isConnected) returnFocusElement.focus();
  }
}
