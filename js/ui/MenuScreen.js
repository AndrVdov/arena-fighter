/**
 * ГЛАВНОЕ МЕНЮ
 * ------------
 * Три слота сохранений: продолжить игру, создать нового героя
 * (имя + распределение стартовых очков) или удалить сохранение.
 */
class MenuScreen extends Screen {

  constructor(game) {
    super(game);
    this.creation = null; // состояние формы создания героя
  }

  get id() {
    return 'menu';
  }

  get showsHud() {
    return false;
  }

  get showsGameNavigation() {
    return false;
  }

  get sessionRestorable() {
    return false;
  }

  // ===== Список слотов =====

  render(container) {
    this.container = container;
    this.creation = null;

    const cards = this.game.saveManager.slots()
      .map(({ slot, data }) => this.slotCard(slot, data))
      .join('');

    container.innerHTML = `
      ${this.banner('Arena Fighter', 'Стань чемпіоном арени')}
      <div class="menu-slots">${cards}</div>
    `;

    container.querySelectorAll('[data-menu-action]').forEach(button => {
      button.addEventListener('click', () =>
        this.handleAction(button.dataset.menuAction, Number(button.dataset.slot)));
    });
  }

  slotCard(slot, data) {
    if (!data) {
      return `
        <div class="panel slot-card slot-card--empty">
          <div class="slot-card__avatar">✧</div>
          <div class="slot-card__name">Порожній слот</div>
          <div class="slot-card__meta">Слот ${slot}</div>
          <div class="slot-card__buttons">
            <button class="btn" data-menu-action="new" data-slot="${slot}">🆕 Нова гра</button>
          </div>
        </div>
      `;
    }

    const p = data.player;
    return `
      <div class="panel slot-card">
        <div class="slot-card__avatar">${Hud.SHIELD_SVG}</div>
        <div class="slot-card__name">${p.name}</div>
        <div class="slot-card__meta">Рівень ${p.level} • 🪙 ${p.gold}</div>
        <div class="slot-card__saved">Збережено: ${this.formatDate(data.savedAt)}</div>
        <div class="slot-card__buttons">
          <button class="btn btn--primary btn--small" data-menu-action="continue" data-slot="${slot}">▶ Продовжити</button>
          <button class="btn btn--small btn--danger" data-menu-action="delete" data-slot="${slot}" title="Видалити збереження">🗑️</button>
        </div>
      </div>
    `;
  }

  handleAction(action, slot) {
    switch (action) {
      case 'continue':
        this.game.continueGame(slot);
        break;

      case 'new':
        this.startCreation(slot);
        break;

      case 'delete':
        this.game.confirm('Видалити це збереження назавжди?', () => {
          this.game.saveManager.clear(slot);
          this.render(this.container);
        });
        break;
    }
  }

  formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ===== Создание героя =====

  startCreation(slot) {
    this.creation = {
      slot,
      stats: { ...BALANCE.player.baseStats },
      freeLeft: BALANCE.player.startFreePoints,
    };
    this.renderCreation('Герой');
  }

  renderCreation(nameValue) {
    const c = this.creation;

    this.container.innerHTML = `
      ${this.banner('Новий герой', `Слот ${c.slot}`)}

      <div class="panel create-form">
        <label class="create-form__label" for="hero-name">Ім'я героя</label>
        <input type="text" id="hero-name" maxlength="16" value="${nameValue}">

        <div class="create-form__points">Вільні очки: <b>${c.freeLeft}</b></div>
        ${this.statRow('strength', '💪 Сила')}
        ${this.statRow('agility', '🏃 Спритність')}
        ${this.statRow('vitality', '❤️ Життя')}
        <p class="create-form__hint">Нерозподілені очки залишаться — їх можна вкласти пізніше.</p>

        <div class="create-form__buttons">
          <button class="btn btn--primary" id="create-start">Почати</button>
          <button class="btn" id="create-back">⬅ Назад</button>
        </div>
      </div>
    `;

    this.container.querySelectorAll('[data-stat-change]').forEach(button => {
      button.addEventListener('click', () => {
        this.changeStat(button.dataset.statChange, Number(button.dataset.delta));
      });
    });

    this.container.querySelector('#create-start').addEventListener('click', () => this.create());
    this.container.querySelector('#create-back').addEventListener('click', () => this.render(this.container));
  }

  statRow(stat, label) {
    const c = this.creation;
    const base = BALANCE.player.baseStats[stat];

    return `
      <div class="create-form__stat">
        <span>${label}: <b>${c.stats[stat]}</b></span>
        <span class="create-form__controls">
          <button class="btn btn--small" data-stat-change="${stat}" data-delta="-1"
                  ${c.stats[stat] <= base ? 'disabled' : ''}>−</button>
          <button class="btn btn--small" data-stat-change="${stat}" data-delta="1"
                  ${c.freeLeft <= 0 ? 'disabled' : ''}>+</button>
        </span>
      </div>
    `;
  }

  changeStat(stat, delta) {
    const c = this.creation;
    const base = BALANCE.player.baseStats[stat];

    if (delta > 0 && c.freeLeft <= 0) return;
    if (delta < 0 && c.stats[stat] <= base) return;

    c.stats[stat] += delta;
    c.freeLeft -= delta;

    // Перерисовываем форму, сохранив введённое имя
    this.renderCreation(this.container.querySelector('#hero-name').value);
  }

  create() {
    const c = this.creation;
    const name = this.container.querySelector('#hero-name').value.trim() || 'Герой';

    this.game.newGame(c.slot, {
      name,
      strength: c.stats.strength,
      agility: c.stats.agility,
      vitality: c.stats.vitality,
      freeStatPoints: c.freeLeft,
    });
  }
}
