/**
 * ОКНО ХАРАКТЕРИСТИК
 * ------------------
 * Сводка героя, распределение свободных очков, боевые показатели
 * и все постоянные и временные эффекты.
 */
class StatsModal extends Modal {

  get title() {
    return `${Hud.icon('stats')}<span>Характеристики</span>`;
  }

  get panelClass() {
    return 'stats-modal';
  }

  contentHtml() {
    const player = this.game.player;
    const safeName = this.escapeHtml(player.name);
    const safeRaceName = this.escapeHtml(player.race.name);

    return `
      <header class="stats-hero-summary">
        <img class="stats-hero-summary__portrait" src="${this.escapeHtml(player.portrait)}"
             alt="Портрет героя ${safeName}">
        <div class="stats-hero-summary__identity">
          <span class="stats-hero-summary__race">${Hud.icon('race')}${safeRaceName}</span>
          <strong>${safeName}</strong>
          <span>Рівень ${player.level}</span>
        </div>
        <div class="stats-points${player.freeStatPoints > 0 ? ' stats-points--available' : ''}">
          ${Hud.icon('star')}
          <span>Вільні очки</span>
          <b>${player.freeStatPoints}</b>
        </div>
      </header>

      <div class="stats-dashboard">
        <section class="stats-section">
          ${this.sectionTitle('stats', 'Основні характеристики')}
          <div class="stats-primary-list">
            ${this.primaryStatCard('strength', 'equipment', 'Сила', player.strength, player.effectiveStrength)}
            ${this.primaryStatCard('agility', 'rookie', 'Спритність', player.agility, player.effectiveAgility)}
            ${this.primaryStatCard('vitality', 'heart', 'Життя', player.vitality, player.effectiveVitality)}
          </div>
        </section>

        <section class="stats-section">
          ${this.sectionTitle('equipment', 'Бойові параметри')}
          <div class="stats-combat-grid">
            ${this.combatStatCard('equipment', 'Урон', player.attackDamage)}
            ${this.combatStatCard('shield', 'Броня', player.armor)}
            ${this.combatStatCard(
              'shield',
              'Блок щитом',
              `${Math.round(player.shieldBlockChance * 100)}%`,
              `−${player.shieldBlockArmor} урону при блоці`
            )}
            ${this.combatStatCard('heart', 'Макс. HP', player.maxHp)}
          </div>
        </section>
      </div>

      ${this.effectsHtml(player)}
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

  sectionTitle(icon, label, suffix = '') {
    return `
      <h3 class="stats-section__title">
        ${Hud.icon(icon)}<span>${label}</span>${suffix}
      </h3>
    `;
  }

  primaryStatCard(stat, icon, label, base, effective) {
    const player = this.game.player;
    const isModified = effective !== base;
    const plusButton = player.freeStatPoints > 0
      ? `
        <button class="stats-primary-card__increase" data-stat="${stat}"
                aria-label="Підвищити характеристику ${label}" title="Підвищити ${label}">+</button>
      `
      : '';

    return `
      <article class="stats-primary-card${isModified ? ' stats-primary-card--modified' : ''}">
        <span class="stats-primary-card__icon">${Hud.icon(icon)}</span>
        <div class="stats-primary-card__name">
          <strong>${label}</strong>
          <span>базове → діюче</span>
        </div>
        <div class="stats-primary-card__values" aria-label="Базове значення ${base}, діюче ${effective}">
          <span>${base}</span><i>→</i><b>${effective}</b>
        </div>
        ${plusButton}
      </article>
    `;
  }

  combatStatCard(icon, label, value, detail = '') {
    return `
      <article class="stats-combat-card">
        <span class="stats-combat-card__icon">${Hud.icon(icon)}</span>
        <div>
          <span>${label}</span>
          <strong>${value}</strong>
          ${detail ? `<small>${detail}</small>` : ''}
        </div>
      </article>
    `;
  }

  /** Все постоянные и временные эффекты героя из общего UI-агрегатора. */
  effectsHtml(player) {
    const effects = EffectsBar.collectPlayerEffects(player, this.game);
    if (!effects.length) return '';

    const effectCards = effects.map(effect => `
      <div class="stats-effect stats-effect--${effect.type}" title="${this.escapeHtml(effect.hint)}">
        <span class="stats-effect__icon">${Hud.icon(effect.icon)}</span>
        <span>${this.escapeHtml(effect.text)}</span>
      </div>
    `).join('');

    const count = `<span class="stats-section__count">${effects.length}</span>`;
    return `
      <section class="stats-section stats-effects">
        ${this.sectionTitle('elixir', 'Активні ефекти', count)}
        <div class="stats-effects__grid">${effectCards}</div>
      </section>
    `;
  }

  escapeHtml(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
  }
}
