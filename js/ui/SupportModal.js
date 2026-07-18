/** Окно добровольной поддержки разработки игры. */
class SupportModal extends Modal {

  get title() {
    return `${Hud.icon('support')}<span>Підтримати гру</span>`;
  }

  get panelClass() {
    return 'support-modal';
  }

  contentHtml() {
    return `
      <div class="support-modal__message">
        <p>
          <strong>Arena Fighter створюється для своїх</strong> — для гравців, які люблять
          чесні бої, розвиток героя та атмосферу старих браузерних RPG.
        </p>
        <p>
          Якщо тобі подобається гра і ти хочеш допомогти їй розвиватися,
          можеш підтримати проєкт будь-якою сумою.
        </p>
      </div>
      <a class="btn btn--primary support-modal__link" href="${APP.supportUrl}"
         target="_blank" rel="noopener noreferrer">
        ${Hud.icon('support')}<span>Підтримати в Monobank</span>
      </a>
      <p class="support-modal__hint">Банка Monobank відкриється в новій вкладці.</p>
    `;
  }
}
