/**
 * МОДАЛЬНОЕ ОКНО
 * --------------
 * Базовый класс окон поверх текущего экрана (характеристики,
 * инвентарь, снаряжение). Локация под окном не меняется.
 *
 * Наследник определяет title, contentHtml() и bindContent()
 * (делегированные обработчики вешаются один раз при открытии,
 * refresh() только перерисовывает содержимое).
 */
class Modal {

  constructor(game) {
    this.game = game;
    this.overlay = null;
  }

  /** Заголовок окна. */
  get title() {
    return '';
  }

  /** Надпись на кнопке закрытия (наследник может заменить). */
  get closeLabel() {
    return 'Закрити';
  }

  /** Дополнительный класс панели для тематических окон. */
  get panelClass() {
    return '';
  }

  /** HTML содержимого. Переопределяется наследником. */
  contentHtml() {
    return '';
  }

  /** Делегированные обработчики содержимого. Вызывается один раз. */
  bindContent(contentElement) {}

  open() {
    this.close(); // не плодим дубли

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay';
    this.overlay.innerHTML = `
      <div class="panel modal${this.panelClass ? ` ${this.panelClass}` : ''}">
        <div class="panel__title">${this.title}</div>
        <div class="modal__content"></div>
        <button class="btn modal__close">${this.closeLabel}</button>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.game.openModal = this; // чтобы Esc закрывал окно через close()

    this.overlay.querySelector('.modal__close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', event => {
      if (event.target === this.overlay) this.close(); // клик мимо окна
    });

    const content = this.overlay.querySelector('.modal__content');
    content.innerHTML = this.contentHtml();
    this.bindContent(content);
  }

  /** Перерисовать содержимое (после действия игрока). */
  refresh() {
    if (!this.overlay) return;
    this.overlay.querySelector('.panel__title').innerHTML = this.title;
    this.overlay.querySelector('.modal__content').innerHTML = this.contentHtml();
    this.overlay.querySelector('.modal__close').textContent = this.closeLabel;
  }

  close() {
    this.overlay?.remove();
    this.overlay = null;
    if (this.game.openModal === this) this.game.openModal = null;
  }
}
