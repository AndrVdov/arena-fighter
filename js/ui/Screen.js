/**
 * БАЗОВЫЕ ЭКРАНЫ
 * ---------------
 * Screen описывает любой самостоятельный экран интерфейса: меню, локацию
 * или домашнее хранилище. LocationScreen добавляет только то,
 * что действительно относится к физическому месту игрового мира.
 */
class Screen {

  /**
   * @param {Game} game — ссылка на игру для навигации и доступа к игроку
   */
  constructor(game) {
    this.game = game;
  }

  /** Уникальный идентификатор экрана в реестре Game. */
  get id() {
    throw new Error('Экран должен указать id');
  }

  /** Визуальная тема может отличаться от id (сундук использует тему дома). */
  get theme() {
    return this.id;
  }

  get cssClass() {
    return `screen--${this.theme}`;
  }

  /** Настройки оболочки экрана; Game не должен знать имена конкретных экранов. */
  get showsHud() {
    return true;
  }

  get showsGameNavigation() {
    return true;
  }

  get sessionRestorable() {
    return true;
  }

  /** null означает, что экран не меняет фактическое местоположение героя. */
  get playerLocationId() {
    return null;
  }

  /** Отрисовка экрана в контейнер. Каждый экран реализует по-своему. */
  render(container) {
    throw new Error('Экран должен реализовать render()');
  }

  /** Общая декоративная вывеска для экранов, которым она подходит. */
  banner(title, subtitle) {
    return `
      <div class="banner">
        <div class="banner__title">${title}</div>
        <div class="banner__subtitle">${subtitle}</div>
      </div>
    `;
  }
}

/** Базовый класс физической локации игрового мира. */
class LocationScreen extends Screen {

  get locationId() {
    throw new Error('Локация должна указать locationId');
  }

  get id() {
    return this.locationId;
  }

  get playerLocationId() {
    return this.locationId;
  }

  get location() {
    const location = LOCATIONS[this.locationId];
    if (!location) throw new Error(`Неизвестная локация: ${this.locationId}`);
    return location;
  }
}
