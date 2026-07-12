/**
 * ГЛАВНОЕ МЕНЮ
 * ------------
 * Шесть слотов сохранений: продолжить игру, создать нового героя
 * (имя + распределение стартовых очков) или удалить сохранение.
 */
class MenuScreen extends Screen {

  static PLAYER_RACE_IDS = ['bandit', 'goblin', 'orc', 'undead', 'elf', 'demon'];

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
    window.scrollTo(0, 0);

    const lastSlot = this.game.saveManager.lastSlot();
    const cards = this.game.saveManager.slots()
      .map(({ slot, data }) => this.slotCard(slot, data, slot === lastSlot))
      .join('');

    container.innerHTML = `
      <header class="hero-select__header">
        <div class="hero-select__eyebrow">Arena Fighter</div>
        <h1 class="hero-select__title">Обери героя</h1>
        <p class="hero-select__subtitle">Шість шляхів до слави</p>
      </header>
      <div class="menu-slots" aria-label="Збережені герої">${cards}</div>
    `;

    container.querySelectorAll('[data-menu-action]').forEach(button => {
      button.addEventListener('click', () =>
        this.handleAction(button.dataset.menuAction, Number(button.dataset.slot)));
    });
  }

  slotCard(slot, data, isLast) {
    if (!data) {
      return `
        <button class="panel slot-card slot-card--empty" data-menu-action="new" data-slot="${slot}"
                aria-label="Створити нового героя у слоті ${slot}">
          <span class="slot-card__number">Слот ${slot}</span>
          <span class="slot-card__empty-avatar" aria-hidden="true">+</span>
          <span class="slot-card__name">Створити нового героя</span>
          <span class="slot-card__empty-hint">Обери расу та почни шлях на арену</span>
        </button>
      `;
    }

    const p = data.player;
    const player = Player.fromJSON(p);
    const race = player.race;
    const location = this.locationName(player.location);
    const safeName = this.escapeHtml(player.name);
    const safeAttributeName = this.escapeAttribute(player.name);
    return `
      <article class="panel slot-card slot-card--filled${isLast ? ' slot-card--last' : ''}">
        <div class="slot-card__topline">
          <span class="slot-card__number">Слот ${slot}</span>
          ${isLast ? '<span class="slot-card__last-label">Остання гра</span>' : ''}
        </div>
        <button class="slot-card__hero" data-menu-action="continue" data-slot="${slot}"
                aria-label="Продовжити гру за ${safeAttributeName}">
          <span class="slot-card__portrait-wrap">
            <img class="slot-card__portrait" src="${player.portrait}" alt="${safeAttributeName}, ${race.name}">
          </span>
          <span class="slot-card__identity">
            <strong class="slot-card__name">${safeName}</strong>
            <span class="slot-card__race">${race.name}</span>
          </span>
        </button>
        <div class="slot-card__stats">
          <span><b>${player.level}</b><small>Рівень</small></span>
          <span><b>${player.hp}/${player.maxHp}</b><small>Здоров'я</small></span>
          <span><b>~${player.attackDamage}</b><small>Урон</small></span>
        </div>
        <div class="slot-card__details">
          <span>🪙 ${player.gold}</span>
          <span>⌖ ${location}</span>
        </div>
        <div class="slot-card__footer">
          <span class="slot-card__saved">${this.relativeDate(data.savedAt)}</span>
          <button class="slot-card__more" data-menu-action="options" data-slot="${slot}"
                  aria-label="Дії із героєм ${safeAttributeName}" aria-expanded="false">⋮</button>
          <div class="slot-card__options" data-options-slot="${slot}">
            <button data-menu-action="delete" data-slot="${slot}">🗑 Видалити героя</button>
          </div>
        </div>
      </article>
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

      case 'options':
        this.toggleOptions(slot);
        break;

      case 'delete':
        this.confirmDelete(slot);
        break;
    }
  }

  formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('uk-UA', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  relativeDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return `Сьогодні, ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
    }

    const days = Math.floor((now - date) / 86400000);
    if (days === 1) return 'Учора';
    if (days >= 2 && days <= 4) return `${days} дні тому`;
    if (days >= 5 && days < 7) return `${days} днів тому`;
    return this.formatDate(timestamp);
  }

  locationName(location) {
    return ({ home: 'Дім', arena: 'Арена', shop: 'Крамниця' })[location] ?? 'Дім';
  }

  escapeHtml(value) {
    const element = document.createElement('div');
    element.textContent = String(value);
    return element.innerHTML;
  }

  escapeAttribute(value) {
    return this.escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  toggleOptions(slot) {
    const options = this.container.querySelector(`[data-options-slot="${slot}"]`);
    const button = this.container.querySelector(`[data-menu-action="options"][data-slot="${slot}"]`);
    const willOpen = !options.classList.contains('slot-card__options--open');
    this.container.querySelectorAll('.slot-card__options--open').forEach(menu => {
      menu.classList.remove('slot-card__options--open');
    });
    this.container.querySelectorAll('[data-menu-action="options"]').forEach(trigger => {
      trigger.setAttribute('aria-expanded', 'false');
    });
    if (willOpen) {
      options.classList.add('slot-card__options--open');
      button.setAttribute('aria-expanded', 'true');
    }
  }

  confirmDelete(slot) {
    const data = this.game.saveManager.load(slot);
    if (!data) return;
    const player = Player.fromJSON(data.player);
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <section class="panel delete-hero" role="dialog" aria-modal="true" aria-labelledby="delete-hero-title">
        <div class="delete-hero__icon">⚠</div>
        <h2 id="delete-hero-title">Видалити героя?</h2>
        <p>Цю дію неможливо скасувати.</p>
        <div class="delete-hero__summary">
          <img src="${player.portrait}" alt="">
          <span><b>${this.escapeHtml(player.name)}</b><small>${player.race.name} · рівень ${player.level}</small></span>
        </div>
        <div class="delete-hero__buttons">
          <button class="btn" data-delete-cancel>Скасувати</button>
          <button class="btn btn--danger" data-delete-confirm>Видалити назавжди</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('[data-delete-cancel]').addEventListener('click', close);
    overlay.querySelector('[data-delete-confirm]').addEventListener('click', () => {
      this.game.saveManager.clear(slot);
      close();
      this.render(this.container);
    });
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
  }

  // ===== Создание героя =====

  startCreation(slot) {
    this.creation = {
      slot,
      raceId: 'bandit',
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

        <div class="create-form__race-title">Обери расу</div>
        <div class="create-form__races" role="group" aria-label="Раса героя">
          ${MenuScreen.PLAYER_RACE_IDS.map(raceId => this.raceOption(raceId)).join('')}
        </div>

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

    this.container.querySelectorAll('[data-race-id]').forEach(button => {
      button.addEventListener('click', () => {
        c.raceId = button.dataset.raceId;
        this.renderCreation(this.container.querySelector('#hero-name').value);
      });
    });

    this.container.querySelector('#create-start').addEventListener('click', () => this.create());
    this.container.querySelector('#create-back').addEventListener('click', () => this.render(this.container));
  }

  raceOption(raceId) {
    const race = RACES[raceId];
    const selected = this.creation.raceId === raceId;
    return `
      <button type="button" class="create-race${selected ? ' create-race--selected' : ''}"
              data-race-id="${raceId}" aria-pressed="${selected}">
        <span class="create-race__icon">${race.icon}</span>
        <b>${race.name}</b>
        <small>${Fighter.raceTraitText(race)}</small>
      </button>
    `;
  }

  statRow(stat, label) {
    const c = this.creation;
    const base = BALANCE.player.baseStats[stat];
    const racialValue = Fighter.applyRaceModifier(c.stats[stat], RACES[c.raceId], stat);
    const racialNote = racialValue !== c.stats[stat] ? ` → ${racialValue}` : '';

    return `
      <div class="create-form__stat">
        <span>${label}: <b>${c.stats[stat]}${racialNote}</b></span>
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
      raceId: c.raceId,
      strength: c.stats.strength,
      agility: c.stats.agility,
      vitality: c.stats.vitality,
      freeStatPoints: c.freeLeft,
    });
  }
}
