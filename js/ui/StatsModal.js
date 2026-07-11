/**
 * ОКНО ХАРАКТЕРИСТИК
 * ------------------
 * Статы героя с распределением свободных очков, производные
 * показатели и активные эффекты (эликсиры, потребности).
 */
class StatsModal extends Modal {

  get title() {
    return '📜 Характеристики';
  }

  contentHtml() {
    const p = this.game.player;

    return `
      <div class="modal__subtitle">${p.name}, рівень ${p.level}</div>
      ${p.freeStatPoints > 0 ? `<div class="stat-points">⭐ Вільні очки: ${p.freeStatPoints}</div>` : ''}

      ${this.statRow('strength', '💪 Сила', p.strength, p.effectiveStrength)}
      ${this.statRow('agility', '🏃 Спритність', p.agility, p.effectiveAgility)}
      ${this.statRow('vitality', '❤️ Життя', p.vitality, p.effectiveVitality)}

      <div class="derived-stats">
        <span>⚔️ Урон: ${p.attackDamage}</span>
        <span>💨 Ухилення: +${p.dodgeExtra}%</span>
        <span>🩸 Макс. HP: ${p.maxHp}</span>
      </div>

      ${this.effectsHtml(p)}
    `;
  }

  bindContent(content) {
    content.addEventListener('click', event => {
      const button = event.target.closest('[data-stat]');
      if (!button) return;

      this.game.player.spendStatPoint(button.dataset.stat);
      this.game.refresh();
      this.refresh();
    });
  }

  /** Строка характеристики: база, действующее значение и кнопка «+». */
  statRow(stat, label, base, effective) {
    const player = this.game.player;
    const effectiveNote = effective !== base
      ? ` <span class="stat-effective">(діюча: ${effective})</span>`
      : '';
    const plusButton = player.freeStatPoints > 0
      ? `<button class="btn btn--small" data-stat="${stat}">+</button>`
      : '';

    return `
      <div class="stat-row">
        <span>${label}: <b>${base}</b>${effectiveNote}</span>
        ${plusButton}
      </div>
    `;
  }

  /** Активные эффекты: эликсиры и состояние потребностей. */
  effectsHtml(player) {
    const lines = [];

    for (const buff of player.buffs) {
      lines.push(`<div class="effect effect--buff">🔮 ${ASPECTS[buff.stat].format(buff.value)} (ще боїв: ${buff.fightsLeft})</div>`);
    }
    for (const status of Needs.statusLines(player)) {
      lines.push(`<div class="effect effect--${status.type}">${status.text}</div>`);
    }

    return lines.length
      ? `<div class="effects"><div class="effects__title">Активні ефекти</div>${lines.join('')}</div>`
      : '';
  }
}
