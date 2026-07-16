/** Настройки общей громкости, окружения и звуковых эффектов. */
class AudioSettingsModal extends Modal {

  get title() {
    return 'Звук';
  }

  get panelClass() {
    return 'audio-settings';
  }

  contentHtml() {
    const { enabled, master, ambience, effects } = this.game.audio.settings;
    return `
      <button class="audio-settings__toggle${enabled ? ' audio-settings__toggle--enabled' : ''}"
              data-audio-toggle aria-pressed="${enabled}">
        ${Hud.icon(enabled ? 'volume' : 'volumeOff')}
        <span>${enabled ? 'Звук увімкнено' : 'Звук вимкнено'}</span>
      </button>
      ${this.slider('master', 'Загальна гучність', master)}
      ${this.slider('ambience', 'Оточення', ambience)}
      ${this.slider('effects', 'Ефекти', effects)}
      <p class="audio-settings__hint">
        Звук почне відтворюватися після першої взаємодії з грою.
      </p>
    `;
  }

  slider(channel, label, value) {
    const percent = Math.round(value * 100);
    return `
      <label class="audio-settings__row">
        <span>${label}<b data-audio-value="${channel}">${percent}%</b></span>
        <input type="range" min="0" max="100" step="1" value="${percent}"
               data-audio-volume="${channel}" ${this.game.audio.settings.enabled ? '' : 'disabled'}>
      </label>
    `;
  }

  bindContent(content) {
    content.addEventListener('click', event => {
      const toggle = event.target.closest('[data-audio-toggle]');
      if (!toggle) return;
      this.game.audio.setEnabled(!this.game.audio.settings.enabled);
      this.refresh();
    });

    content.addEventListener('input', event => {
      const input = event.target.closest('[data-audio-volume]');
      if (!input) return;
      const channel = input.dataset.audioVolume;
      this.game.audio.setVolume(channel, Number(input.value) / 100);
      const value = content.querySelector(`[data-audio-value="${channel}"]`);
      if (value) value.textContent = `${input.value}%`;
    });
  }
}
