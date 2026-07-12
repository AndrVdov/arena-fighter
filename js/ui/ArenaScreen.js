/**
 * ЭКРАН АРЕНЫ
 * -----------
 * Две фазы:
 *  1) выбор противника из состава арены (ArenaLineup): состав живёт
 *     в сейве, сам обновляется по таймеру, побеждённый — исчезает;
 *  2) бой — два бойца с HP-барами и красивый лог событий,
 *     затем окно результата с наградами.
 */
class ArenaScreen extends LocationScreen {

  constructor(game) {
    super(game);
    this.activeRoster = 'common';
    this.selectedIndex = null;  // выбранная карточка
    this.currentEnemy = null;   // противник текущего боя
    this.originalEnemy = null;  // сохранённая версия до транзакционного боя
    this.battleMode = 'training';
    this.playbackTimer = null;  // таймер проигрывания лога боя
    this.timerInterval = null;  // обратный отсчёт до новых противников
  }

  get locationId() {
    return 'arena';
  }

  static ROSTER_TABS = [
    { id: 'common', name: 'Звичайні', icon: 'equipment' },
    { id: 'champions', name: 'Чемпіони', icon: 'star' },
    { id: 'kings', name: 'Королі', icon: 'coin' },
    { id: 'revenge', name: 'Помста', icon: 'heart' },
  ];

  render(container) {
    this.container = container;
    clearInterval(this.playbackTimer);
    clearInterval(this.timerInterval);
    this.renderSelect();
  }

  // ===== Фаза 1: выбор противника =====

  renderSelect() {
    const player = this.game.player;
    const lineup = player.arenaLineup;
    this.selectedIndex = null;
    this.container.classList.remove('arena-battle-active');
    document.getElementById('hud-wrap').style.display = 'flex';
    this.game.effectsBar.render();

    // Состав устарел (или герой на арене впервые) — завозим новых бойцов
    if (lineup.isExpired) {
      lineup.refresh(player.level);
      this.game.save();
    }
    if (lineup.purgeExpiredRevenge() > 0) this.game.save();

    const slots = lineup.getSlots(this.activeRoster);
    const cards = slots
      .map((enemy, index) => enemy
        ? this.opponentCard(enemy, index)
        : this.emptyOpponentSlot(index))
      .join('');
    const isRevenge = this.activeRoster === 'revenge';

    this.container.innerHTML = `
      ${this.banner(this.location.name, this.location.subtitle)}

      <section class="arena-select" aria-label="Вибір супротивника">
        <nav class="arena-roster-tabs" aria-label="Розділи арени">
          ${ArenaScreen.ROSTER_TABS.map(tab => `
            <button class="arena-roster-tab${tab.id === this.activeRoster ? ' arena-roster-tab--active' : ''}"
                    data-roster-tab="${tab.id}">
              ${Hud.icon(tab.icon)}<span>${tab.name}</span><b>${lineup.count(tab.id)}</b>
            </button>
          `).join('')}
        </nav>
        <div class="arena-select__header">
          <div class="arena-select__title">${isRevenge ? 'Список помсти' : 'Обери супротивника'}</div>
          ${isRevenge ? `
            <div class="arena-refresh arena-refresh--revenge">Переможці зникають через годину після бою</div>
          ` : `
            <div class="arena-refresh">
              ${Hud.icon('equipment')}
              <span>Новий склад через <b id="arena-timer">--:--</b></span>
            </div>
          `}
        </div>
        <div class="arena-opponents">
          ${cards
            ? `<div class="opponent-list">${cards}</div>`
            : `<p class="empty">${isRevenge
                ? 'Ніхто ще не перемагав тебе — список помсти порожній.'
                : 'У цьому розділі зараз немає супротивників.'}</p>`}
        </div>
        <div class="arena-controls">
          <div class="battle-mode" role="radiogroup" aria-label="Режим бою">
            <button class="battle-mode__option battle-mode__option--active" data-battle-mode="training"
                    role="radio" aria-checked="true">
              <b>Тренувальний</b><small>До 50% HP · ризик усього золота</small>
            </button>
            <button class="battle-mode__option battle-mode__option--lethal" data-battle-mode="lethal"
                    role="radio" aria-checked="false">
              <b>Смертельний</b><small>До 0 HP · ризик усього майна</small>
            </button>
          </div>
          <button class="btn btn--primary arena-fight-button" id="start-fight" disabled>
            ${Hud.icon('equipment')}<span>До бою!</span>
          </button>
        </div>
      </section>
    `;

    this.container.querySelectorAll('[data-roster-tab]').forEach(button => {
      button.addEventListener('click', () => {
        this.activeRoster = button.dataset.rosterTab;
        this.renderSelect();
      });
    });

    this.container.querySelectorAll('.opponent-card').forEach(card => {
      card.addEventListener('click', () => this.selectOpponent(Number(card.dataset.index)));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.selectOpponent(Number(card.dataset.index));
        }
      });
    });

    // Кнопка ⓘ: показать характеристики, НЕ выбирая противника для боя
    this.container.querySelectorAll('.opponent-card__info').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        const enemy = lineup.getEnemy(this.activeRoster, Number(button.dataset.infoIndex));
        if (enemy) this.showEnemyInfo(enemy);
      });
    });

    this.container.querySelector('#start-fight')
      .addEventListener('click', () => this.startBattle());

    this.container.querySelectorAll('[data-battle-mode]').forEach(button => {
      button.addEventListener('click', () => this.selectBattleMode(button.dataset.battleMode));
    });

    this.selectBattleMode(this.battleMode);

    this.startArenaTimer();
  }

  opponentCard(enemy, index) {
    const revengeExpiresAt = this.activeRoster === 'revenge'
      ? this.game.player.arenaLineup.revengeExpiresAt(enemy)
      : 0;
    return `
      <article class="opponent-card" data-index="${index}" role="button" tabindex="0" aria-label="Обрати: ${enemy.title}" aria-selected="false">
        <button class="opponent-card__info" data-info-index="${index}" title="Характеристики супротивника">ⓘ</button>
        <div class="opponent-card__badge">${enemy.elite.badge} ${enemy.elite.name}</div>
        <div class="opponent-card__portrait">
          <img src="${enemy.race.portrait}" alt="${enemy.raceName}">
        </div>
        <div class="opponent-card__name">${enemy.raceName}</div>
        <div class="opponent-card__level">Рівень ${enemy.level}</div>
        <div class="opponent-card__stats">
          <span data-opponent-hp="${index}">${Hud.icon('heart')}<span>${enemy.hp}/${enemy.maxHp}</span></span>
          <span>${Hud.icon('equipment')}~${enemy.attackDamage}</span>
        </div>
        ${revengeExpiresAt ? `
          <div class="opponent-card__revenge-time" data-revenge-expires="${revengeExpiresAt}">Залишилось --:--</div>
        ` : ''}
        <span class="opponent-card__selected-mark">Обрано</span>
      </article>
    `;
  }

  emptyOpponentSlot(index) {
    return `
      <article class="opponent-card opponent-card--empty" data-empty-index="${index}" aria-label="Порожній слот">
        <div class="opponent-card__empty-mark">✧</div>
        <div class="opponent-card__name">Порожній слот</div>
        <div class="opponent-card__empty-hint">Можливо, наступного разу</div>
      </article>
    `;
  }

  selectOpponent(index) {
    this.selectedIndex = index;

    this.container.querySelectorAll('.opponent-card').forEach(card => {
      const selected = Number(card.dataset.index) === index;
      card.classList.toggle('opponent-card--selected', selected);
      card.setAttribute('aria-selected', String(selected));
      if (selected && window.innerWidth <= 620) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
    this.container.querySelector('#start-fight').disabled = false;
  }

  /** Точечно обновить HP карточек, не сбрасывая выбор и таймер состава. */
  refreshOpponentHealth() {
    if (!this.container?.querySelector('.arena-select')) return;
    const slots = this.game.player.arenaLineup.getSlots(this.activeRoster);
    this.container.querySelectorAll('[data-opponent-hp]').forEach(element => {
      const enemy = slots[Number(element.dataset.opponentHp)];
      if (!enemy) return;
      const value = element.querySelector('span');
      if (value) value.textContent = `${enemy.hp}/${enemy.maxHp}`;
    });
  }

  /** Обратный отсчёт до автообновления состава. */
  startArenaTimer() {
    clearInterval(this.timerInterval);
    const label = this.container.querySelector('#arena-timer');
    const root = this.container.querySelector('.arena-select');

    const update = () => {
      if (!root?.isConnected) {
        clearInterval(this.timerInterval);
        return;
      }

      const lineup = this.game.player.arenaLineup;
      if (lineup.isExpired) {
        lineup.refresh(this.game.player.level);
        this.game.save();
        if (this.activeRoster !== 'revenge') {
          clearInterval(this.timerInterval);
          this.renderSelect();
          return;
        }
      }

      if (lineup.purgeExpiredRevenge() > 0) {
        this.game.save();
        if (this.activeRoster === 'revenge') {
          clearInterval(this.timerInterval);
          this.renderSelect();
          return;
        }
      }

      if (label) {
        const totalSeconds = Math.ceil(lineup.msLeft / 1000);
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        label.textContent = `${minutes}:${seconds}`;
      }

      this.container.querySelectorAll('[data-revenge-expires]').forEach(element => {
        const secondsLeft = Math.max(0, Math.ceil((Number(element.dataset.revengeExpires) - Date.now()) / 1000));
        const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
        const seconds = String(secondsLeft % 60).padStart(2, '0');
        element.textContent = `Залишилось ${minutes}:${seconds}`;
      });
    };

    update();
    this.timerInterval = setInterval(update, 1000);
  }

  // ===== Информационное окно противника =====

  /** Шансы крита и уворота между игроком и противником (в процентах). */
  battleChances(enemy) {
    const cfg = BALANCE.combat;
    const player = this.game.player;
    const playerAgility = player.effectiveAgility;
    const enemyAgility = enemy.effectiveAgility;
    const percent = (value, min, max) =>
      `${Math.round(Combat.chance(value, min, max) * 100)}%`;

    const chances = {
      yourCrit: percent(
        cfg.critBase + (playerAgility - enemyAgility) * cfg.critPerAgility,
        cfg.critMin, cfg.critMax
      ),
      yourDodge: percent(
        cfg.dodgeBase + (playerAgility - enemyAgility) * cfg.dodgePerAgility + player.dodgeExtra / 100,
        cfg.dodgeMin, cfg.dodgeMax
      ),
      enemyCrit: percent(
        cfg.critBase + (enemyAgility - playerAgility) * cfg.critPerAgility,
        cfg.critMin, cfg.critMax
      ),
      enemyDodge: percent(
        cfg.dodgeBase + (enemyAgility - playerAgility) * cfg.dodgePerAgility + enemy.dodgeExtra / 100,
        cfg.dodgeMin, cfg.dodgeMax
      ),
    };
    chances.yourHit = `${100 - Number.parseInt(chances.enemyDodge)}%`;
    chances.enemyHit = `${100 - Number.parseInt(chances.yourDodge)}%`;
    return chances;
  }

  showEnemyInfo(enemy) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="panel result-panel enemy-info">
        <div class="enemy-info__header">
          <div class="enemy-info__icon">
            <img src="${enemy.race.portrait}" alt="${enemy.raceName}">
          </div>
          <div>
            <div class="enemy-info__name">${enemy.title}</div>
            <div class="enemy-info__elite">${enemy.elite.badge} ${enemy.elite.name}</div>
          </div>
        </div>

        <p class="enemy-info__lore">${enemy.race.lore}</p>

        <nav class="enemy-info__tabs" aria-label="Відомості про супротивника">
          <button class="enemy-info__tab enemy-info__tab--active" data-enemy-tab="stats">Характеристики</button>
          <button class="enemy-info__tab" data-enemy-tab="equipment">Спорядження</button>
          <button class="enemy-info__tab" data-enemy-tab="inventory">Інвентар</button>
          <button class="enemy-info__tab" data-enemy-tab="combat">Бій</button>
        </nav>
        <div class="enemy-info__content"></div>

        <button class="btn" id="enemy-info-close">Закрити</button>
      </div>
    `;

    document.body.appendChild(overlay);
    const content = overlay.querySelector('.enemy-info__content');
    const renderTab = tabId => {
      overlay.querySelectorAll('.enemy-info__tab').forEach(button =>
        button.classList.toggle('enemy-info__tab--active', button.dataset.enemyTab === tabId));
      content.innerHTML = this.enemyInfoTabHtml(enemy, tabId);
    };
    overlay.querySelectorAll('.enemy-info__tab').forEach(button =>
      button.addEventListener('click', () => renderTab(button.dataset.enemyTab)));
    renderTab('stats');
    overlay.querySelector('#enemy-info-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', event => {
      if (event.target === overlay) overlay.remove(); // клик мимо окна тоже закрывает
    });
  }

  enemyInfoTabHtml(enemy, tabId) {
    if (tabId === 'equipment') {
      return `<div class="enemy-info__item-list">${Object.entries(EQUIPMENT_SLOTS).map(([slot, config]) => {
        const item = enemy.equipment[slot];
        return item
          ? ItemRow.html(item)
          : `<div class="enemy-info__empty-slot"><span>${config.icon}</span><b>${config.name}</b><em>Порожньо</em></div>`;
      }).join('')}</div>`;
    }

    if (tabId === 'inventory') {
      const items = enemy.inventory.items.length
        ? enemy.inventory.items.map(item => ItemRow.html(item)).join('')
        : '<p class="empty">Інвентар порожній</p>';
      return `
        <div class="enemy-info__wallet">${Hud.icon('coin')} Золото: <b>${enemy.gold}</b></div>
        <div class="enemy-info__item-list">${items}</div>
        <p class="enemy-info__note">Їжу та воду супротивник використовує одразу, лікувальні зілля — після перемоги, а один еліксир може випити перед боєм.</p>
      `;
    }

    if (tabId === 'combat') {
      const chances = this.battleChances(enemy);
      return `
        <div class="enemy-info__section">Твої показники</div>
        <div class="enemy-info__rows">
          <span>Влучання: <b>${chances.yourHit}</b></span>
          <span>Крит: <b>${chances.yourCrit}</b></span>
          <span>Ухилення: <b>${chances.yourDodge}</b></span>
        </div>
        <div class="enemy-info__section">Показники супротивника</div>
        <div class="enemy-info__rows">
          <span>Влучання: <b>${chances.enemyHit}</b></span>
          <span>Крит: <b>${chances.enemyCrit}</b></span>
          <span>Ухилення: <b>${chances.enemyDodge}</b></span>
        </div>
        <p class="enemy-info__note">Усі значення вже враховують спорядження та обмеження шансів 2–50%.</p>
      `;
    }

    const stat = (icon, label, base, total) =>
      `<span>${icon} ${label}: <b>${base}${total !== base ? ` → ${total}` : ''}</b></span>`;
    const effects = EffectsBar.collectEnemyEffects(enemy);
    return `
      <div class="enemy-info__section">Базові → підсумкові</div>
      <div class="enemy-info__rows">
        ${stat('💪', 'Сила', enemy.strength, enemy.effectiveStrength)}
        ${stat('🏃', 'Спритність', enemy.agility, enemy.effectiveAgility)}
        ${stat('❤️', 'Життя', enemy.vitality, enemy.effectiveVitality)}
        <span>🩸 HP: <b>${enemy.hp} / ${enemy.maxHp}</b></span>
        <span>⚔️ Урон: <b>~${enemy.attackDamage}</b></span>
        <span>✨ Досвід: <b>${enemy.xpReward}</b></span>
      </div>
      <div class="enemy-info__section">Потреби</div>
      <div class="enemy-info__needs">
        ${this.enemyNeedHtml(enemy, 'hunger')}
        ${this.enemyNeedHtml(enemy, 'thirst')}
        ${this.enemyNeedHtml(enemy, 'sleep')}
      </div>
      ${effects.length ? `
        <div class="enemy-info__section">Активні ефекти</div>
        <div class="enemy-info__active-effects">
          ${effects.map(effect => `
            <div class="enemy-info__active-effect enemy-info__active-effect--${effect.type}" title="${effect.hint}">
              ${Hud.icon(effect.icon)}<span>${effect.text}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  enemyNeedHtml(enemy, need) {
    const value = enemy.needs[need];
    const { info, bonus, state } = Needs.effectFor(enemy, need);
    const effect = bonus > 0
      ? `+${bonus} до ${info.statName}`
      : bonus < 0 ? `−${Math.abs(bonus)} до ${info.statName}` : 'Без модифікатора';
    const width = value / BALANCE.needs.max * 100;
    return `
      <div class="enemy-info__need enemy-info__need--${state}">
        <div class="enemy-info__need-heading">
          ${Hud.icon(need)}
          <span>${info.name}</span>
          <b>${value} / ${BALANCE.needs.max}</b>
        </div>
        <div class="bar" role="meter" aria-label="${info.name}" aria-valuemin="0"
             aria-valuemax="${BALANCE.needs.max}" aria-valuenow="${value}">
          <div class="bar__fill bar__fill--${need}" style="width:${width}%"></div>
        </div>
        <small>${effect}</small>
      </div>
    `;
  }

  // ===== Фаза 2: бой =====

  selectBattleMode(mode) {
    this.battleMode = Combat.MODES[mode] ? mode : 'training';
    this.container.querySelectorAll('[data-battle-mode]').forEach(button => {
      const selected = button.dataset.battleMode === this.battleMode;
      button.classList.toggle('battle-mode__option--active', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  }

  startBattle() {
    if (this.selectedIndex === null) return;

    this.originalEnemy = this.game.player.arenaLineup.getEnemy(this.activeRoster, this.selectedIndex);
    if (!this.originalEnemy) return;

    const mode = this.battleMode;
    const missingGold = this.originalEnemy.missingChallengeGold(this.game.player.gold);
    if (mode === 'training' && missingGold > 0) {
      this.game.toast(
        `Супротивник відхилив виклик. Ставка — ${this.originalEnemy.challengeStake} золота. `
          + `Вам не вистачає ${missingGold} золота.`
      );
      return;
    }

    if (mode === 'lethal') {
      this.game.confirm(
        'Смертельний бій триває до 0 HP. У разі поразки ти втратиш усе золото, інвентар і надіте спорядження. Продовжити?',
        () => this.beginBattle(mode)
      );
      return;
    }

    this.beginBattle(mode);
  }

  beginBattle(mode) {
    if (!this.originalEnemy) return;

    clearInterval(this.timerInterval); // во время боя состав не трогаем
    this.currentEnemy = Enemy.fromJSON(this.originalEnemy.toJSON());
    this.game.inCombat = true;
    const usedItem = this.currentEnemy.usePreBattleElixir(this.game.player.level);
    const openingEvents = usedItem ? [{
      type: 'item',
      text: `🧪 ${this.currentEnemy.title} використовує «${usedItem.name}»: ${usedItem.describe()}.`,
    }] : [];
    const result = Combat.simulate(this.game.player, this.currentEnemy, openingEvents, mode);

    this.renderBattle(this.currentEnemy, mode);
    document.getElementById('hud-wrap').style.display = 'none';
    this.game.setGameNavigationVisible(false); // во время боя не сбежать с арены
    this.playEvents(result, this.currentEnemy);
  }

  renderBattle(enemy, mode) {
    const player = this.game.player;
    this.container.classList.add('arena-battle-active');

    this.container.innerHTML = `
      <div class="arena-battle">
        <div class="battle-mode-badge battle-mode-badge--${mode}">
          ${mode === 'training' ? 'Тренувальний бій · до 50% HP' : 'Смертельний бій · до 0 HP'}
        </div>
        <div class="battle-stage">
          ${this.fighterHtml('player', '🛡️', player.name, player.hp, player.maxHp, player.portrait,
            EffectsBar.collectPlayerEffects(player, this.game))}
          <div class="battle-versus" aria-hidden="true">
            ${Hud.icon('equipment')}
            <span>VS</span>
          </div>
          ${this.fighterHtml('enemy', enemy.race.icon, enemy.title, enemy.hp, enemy.maxHp, enemy.race.portrait,
            EffectsBar.collectEnemyEffects(enemy))}
        </div>

        <div class="battle-feed">
          <div class="battle-feed__title">Хід бою</div>
          <div class="battle-log" id="battle-log" aria-live="polite"></div>
        </div>
      </div>
    `;
  }

  fighterHtml(side, icon, name, hp, maxHp, portrait = null, effects = []) {
    return `
      <div class="fighter${hp / maxHp <= 0.2 ? ' fighter--low-hp' : ''}" id="fighter-${side}">
        <div class="fighter__effects fighter__effects--${side}">
          ${effects.length ? effects.map(effect => `
            <div class="battle-effect battle-effect--${effect.type}" title="${effect.hint}">
              ${Hud.icon(effect.icon)}<span>${effect.text}</span>
            </div>
          `).join('') : '<div class="battle-effect battle-effect--empty">Немає ефектів</div>'}
        </div>
        <div class="fighter__hp">
          <div class="fighter__name">${name}</div>
          <div class="bar">
            <div class="bar__fill bar__fill--hp" style="width: ${(hp / maxHp) * 100}%"></div>
            <span class="bar__label" id="hp-label-${side}">${hp} / ${maxHp}</span>
          </div>
        </div>
        <div class="fighter__figure">
          <div class="fighter__shadow"></div>
          <div class="fighter__portrait${portrait ? ' fighter__portrait--image' : ''}">
            ${portrait ? `<img src="${portrait}" alt="${name}">` : icon}
          </div>
          <div class="fighter__impact" aria-hidden="true">
            <span class="fighter__impact-ring"></span>
            <span class="fighter__impact-label">КРИТ!</span>
          </div>
        </div>
      </div>
    `;
  }

  /** Проиграть события боя с паузами, затем применить результат. */
  playEvents(result, enemy) {
    const log = this.container.querySelector('#battle-log');
    let index = 0;

    this.playbackTimer = setInterval(() => {
      // Игрок ушёл с экрана (например, перезагрузка) — применяем результат сразу
      if (!log.isConnected) {
        clearInterval(this.playbackTimer);
        this.applyResult(result, enemy, { silent: true });
        return;
      }

      const event = result.events[index++];
      this.appendLogLine(log, event);
      if (event.defenderSide) this.updateFighterHp(event);

      if (index >= result.events.length) {
        clearInterval(this.playbackTimer);
        setTimeout(() => this.applyResult(result, enemy), 600);
      }
    }, BALANCE.combat.turnDelayMs);
  }

  appendLogLine(log, event) {
    const line = document.createElement('div');
    line.className = `log-line log-line--${event.type}`;
    line.textContent = event.text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  updateFighterHp(event) {
    if (event.defenderHp === undefined) {
      // Уворот — встряхнём уклонившегося
      this.flashFighter(event.defenderSide, 'fighter--dodge');
      return;
    }

    const fighter = this.container.querySelector(`#fighter-${event.defenderSide}`);
    const maxHp = event.defenderSide === 'player'
      ? this.game.player.maxHp
      : this.currentEnemy.maxHp;

    fighter.querySelector('.bar__fill').style.width = `${(event.defenderHp / maxHp) * 100}%`;
    fighter.querySelector('.bar__label').textContent = `${event.defenderHp} / ${maxHp}`;
    fighter.classList.toggle('fighter--low-hp', event.defenderHp / maxHp <= 0.2);
    this.flashFighter(
      event.defenderSide,
      event.type === 'crit' ? 'fighter--crit' : 'fighter--hit'
    );
  }

  flashFighter(side, cssClass) {
    const fighter = this.container.querySelector(`#fighter-${side}`);
    fighter.classList.remove('fighter--hit', 'fighter--dodge', 'fighter--crit');
    void fighter.offsetWidth; // перезапуск CSS-анимации
    fighter.classList.add(cssClass);
  }

  // ===== Результат боя =====

  applyResult(result, enemy, { silent = false } = {}) {
    const player = this.game.player;
    const rosterEnemy = this.originalEnemy ?? enemy;
    const lethal = result.mode === 'lethal';
    const rewards = {
      mode: result.mode, xp: 0, gold: 0, items: [], equipment: [], levelsGained: 0,
      lostGold: 0, lostItems: [], lostEquipment: [],
    };

    if (result.playerWon) {
      rewards.xp = enemy.xpReward;
      rewards.gold = enemy.gold;
      if (lethal) {
        rewards.items = enemy.inventory.transferAllTo(player.inventory);
        rewards.equipment = enemy.drainEquipmentTo(player.inventory);
      }
      player.gold += rewards.gold;
      enemy.gold = 0;
      player.hp = Math.max(1, result.playerHpLeft);
      rewards.levelsGained = player.gainXp(rewards.xp);

      if (lethal) player.arenaLineup.remove(rosterEnemy);
      else {
        enemy.hp = Math.max(1, result.enemyHpLeft);
        player.arenaLineup.replace(rosterEnemy, enemy);
      }
    } else {
      rewards.lostGold = player.gold;
      if (lethal) {
        rewards.lostItems = player.inventory.transferAllTo(enemy.inventory);
        rewards.lostEquipment = player.drainEquipmentTo(enemy.inventory);
      }
      enemy.gold += player.gold;
      player.gold = 0;
      player.hp = lethal ? BALANCE.combat.defeatHp : Math.max(1, result.playerHpLeft);
      if (lethal) player.location = 'home';
      enemy.hp = Math.max(1, result.enemyHpLeft);
      if (lethal) enemy.prepareAfterVictory();
    }

    Needs.spendForFight(player);
    Needs.spendForFight(enemy);
    player.spendBuffCharges();
    enemy.spendBuffCharges();
    if (!result.playerWon) {
      if (lethal) player.arenaLineup.moveToRevenge(rosterEnemy, enemy);
      else player.arenaLineup.replace(rosterEnemy, enemy);
    }

    this.selectedIndex = null;
    this.currentEnemy = null;
    this.originalEnemy = null;
    this.game.inCombat = false;
    this.game.setGameNavigationVisible(true);
    this.game.refresh();

    if (!silent) this.renderResult(result.playerWon, rewards);
  }

  renderResult(playerWon, rewards) {
    const rewardLines = [];

    if (playerWon) {
      rewardLines.push(`<li>✨ Досвід: +${rewards.xp}</li>`);
      rewardLines.push(`<li>🪙 Золото: +${rewards.gold}</li>`);
      rewards.items.forEach(item => rewardLines.push(
        `<li>${ItemRow.html(item, [], '', { playerLevel: this.game.player.level })}</li>`));
      rewards.equipment.forEach(item => rewardLines.push(
        `<li>${ItemRow.html(item, [], '', { playerLevel: this.game.player.level })}</li>`));
      if (rewards.levelsGained > 0) {
        rewardLines.push(`<li class="result__levelup">🎉 Новий рівень! +${rewards.levelsGained * BALANCE.player.statPointsPerLevel} очок характеристик</li>`);
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="panel result-panel">
        <div class="panel__title">${playerWon ? '🏆 Перемога!' : rewards.mode === 'training' ? '🏳️ Поразка' : '☠️ Поразка'}</div>
        ${playerWon
          ? `<ul class="result__rewards">${rewardLines.join('')}</ul>`
          : rewards.mode === 'training'
            ? `<p class="placeholder">Супротивник забрав ${rewards.lostGold} золота. Інвентар і спорядження залишилися при тобі.</p>`
            : `<p class="placeholder">Супротивник забрав ${rewards.lostGold} золота, предметів: ${rewards.lostItems.length}, спорядження: ${rewards.lostEquipment.length}.</p>`}
        <button class="btn btn--primary" id="result-continue">Продовжити</button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#result-continue').addEventListener('click', () => {
      overlay.remove();
      if (!playerWon && rewards.mode === 'lethal') this.game.showScreen('home');
      else this.renderSelect();
    });
  }
}
