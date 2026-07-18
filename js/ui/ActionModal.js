/**
 * ОКНО ДЛИТЕЛЬНОГО ДЕЙСТВИЯ (отдых / сон / работа)
 * ---------------------------------------
 * Действие идёт, ПОКА окно открыто: Game.startRegen каждый тик
 * проверяет game.activeAction и применяет эффекты. Закрытие окна
 * любым способом (кнопка, клик мимо, Esc) прерывает действие.
 */
class ActionModal extends Modal {

  /** Имя действия для game.activeAction ('rest' / 'sleep' / 'mine'). */
  get actionName() {
    throw new Error('ActionModal должен указать actionName');
  }

  /** Можно ли начать действие. Наследник показывает toast и возвращает false. */
  canStart() {
    return true;
  }

  open() {
    if (!this.canStart()) return;

    super.open();
    this.game.activeAction = this.actionName;
    this.game.audio.setAction(this.actionName);
    this.game.effectsBar.render(); // бафф действия сразу виден в панели эффектов
  }

  close() {
    super.close();

    if (this.game.activeAction === this.actionName) {
      this.game.activeAction = null;
      this.game.audio.setAction(null);
      this.game.effectsBar.render();
      this.game.save();
    }
  }

  /** Полоса прогресса для окна (HP, сон и т.п.). */
  progressBar(kind, value, max) {
    const percent = Math.max(0, Math.min(100, (value / max) * 100));

    return `
      <div class="bar action-modal__bar">
        <div class="bar__fill bar__fill--${kind}" style="width: ${percent}%"></div>
        <span class="bar__label">${value} / ${max}</span>
      </div>
    `;
  }

  /** Человекочитаемая целочисленная скорость постепенного восстановления. */
  recoveryRateText(value, unit = '') {
    if (value >= 1) return `+${Math.round(value)}${unit} за тік у середньому`;

    const ticksPerUnit = Math.max(1, Math.round(1 / value));
    return `+1${unit} кожні ${ticksPerUnit} тіки`;
  }
}
