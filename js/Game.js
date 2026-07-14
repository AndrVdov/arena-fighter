/**
 * ИГРА
 * ----
 * Главный класс: главное меню со слотами сохранений, вход в игру
 * (продолжить / новый герой), навигация между экранами,
 * сохранение и естественная регенерация HP.
 */
class Game {

  constructor() {
    this.saveManager = new SaveManager();
    this.player = null;
    this.currentSlot = null;
    this.hud = null;
    this.effectsBar = null;
    this.screens = {};
    this.screenContainer = document.getElementById('screen');
    this.gameNavigationVisible = false;
    this.currentScreenId = null;
    this.modals = {};
    this.openModal = null;    // открытое окно-класс (Modal)
    this.activeAction = null; // длительное действие: 'rest' / 'sleep' / null
    this.inCombat = false;    // бой проигрывается: естественная регенерация на паузе
    this.isTraveling = false;
    this.travel = null;
    this.toastTimer = null;
  }

  /** Запуск: восстанавливаем последнюю сессию или показываем главное меню. */
  start() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    this.registerScreens([
      new MenuScreen(this),
      new HomeScreen(this),
      new RiverScreen(this),
      new MineScreen(this),
      new ArenaScreen(this),
      new ShopScreen(this),
      new StorageScreen(this),
    ]);

    // Модальные окна героя — открываются поверх любого экрана
    this.modals = {
      stats:     new StatsModal(this),
      inventory: new InventoryModal(this),
      equipment: new EquipmentModal(this),
      rest:      new RestModal(this),
      sleep:     new SleepModal(this),
      mine:      new MineModal(this),
      map:       new WorldMapModal(this),
    };
    this.travel = new TravelOverlay(this);

    this.renderNav();
    this.startRegen();

    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('keydown', event => this.onKeyDown(event));

    if (!this.restoreSession()) this.showScreen('menu');
  }

  // ===== Вход и выход из игры =====

  /** Продолжить игру из слота сохранения. */
  continueGame(slot) {
    const record = this.saveManager.load(slot);
    if (!record) return;

    this.enterGame(Player.fromJSON(record.player), slot);
  }

  /** Начать новую игру в слоте с созданным героем. */
  newGame(slot, heroConfig) {
    this.enterGame(new Player(heroConfig), slot);
  }

  enterGame(player, slot, screenId = 'home') {
    this.player = player;
    this.currentSlot = slot;

    this.hud = new Hud(document.getElementById('hud'), this.player);
    this.effectsBar = new EffectsBar(document.getElementById('effects-bar'), this);
    this.hud.render();
    this.effectsBar.render();
    this.showScreen(screenId);
    this.save();
  }

  /** Автоматически открыть героя и экран из последней живой сессии. */
  restoreSession() {
    const session = this.saveManager.loadSession();
    if (!session) return false;

    const record = this.saveManager.load(session.slot);
    // Совместимость с сохранениями старой версии, где карта была экраном.
    const screenId = session.screen === 'map'
      ? (LOCATIONS[record?.player?.location] ? record.player.location : 'home')
      : session.screen;
    const screen = this.screens[screenId];
    const validScreen = Boolean(screen?.sessionRestorable);

    if (!record || !validScreen) {
      this.saveManager.clearSession();
      return false;
    }

    this.enterGame(Player.fromJSON(record.player), session.slot, screenId);
    return true;
  }

  /** Выйти в главное меню (с сохранением). */
  exitToMenu() {
    this.save();
    this.saveManager.clearSession();
    this.player = null;
    this.currentSlot = null;
    this.showScreen('menu');
  }

  /**
   * Esc: сначала закрывает открытое поверх экрана окно; иначе из игры —
   * в меню (кроме боя), из формы героя — к списку слотов.
   */
  onKeyDown(event) {
    if (event.key !== 'Escape') return;
    if (this.isTraveling) return;

    // Окна-классы закрываем через close() — это прерывает отдых/сон
    if (this.openModal) {
      this.openModal.close();
      return;
    }

    const overlay = document.querySelector('.overlay');
    if (overlay) {
      overlay.remove();
      return;
    }

    if (this.player) {
      if (!this.inCombat) this.exitToMenu();
    } else {
      this.showScreen('menu'); // сброс формы создания героя
    }
  }

  // ===== Навигация =====

  /** Путешествие с глобальной карты в физическую локацию. */
  travelTo(locationId) {
    if (!LOCATIONS[locationId]) {
      throw new Error(`Неизвестное направление: ${locationId}`);
    }

    if (!this.player || this.isTraveling) return;

    const originId = this.player.location;
    this.modals.map.close();
    if (originId === locationId) return;

    this.travel.start(LOCATIONS[originId], LOCATIONS[locationId], () => {
      Needs.spend(this.player, BALANCE.travel.needsCost);
      this.player.worldTimeMinutes += BALANCE.travel.gameMinutes;
      this.showScreen(locationId);
      this.refresh();
    });
  }

  /** Зарегистрировать экраны по их собственным идентификаторам. */
  registerScreens(screens) {
    this.screens = {};

    screens.forEach(screen => {
      if (this.screens[screen.id]) {
        throw new Error(`Экран уже зарегистрирован: ${screen.id}`);
      }
      this.screens[screen.id] = screen;
    });
  }

  getScreen(screenId) {
    const screen = this.screens[screenId];
    if (!screen) throw new Error(`Неизвестный экран: ${screenId}`);
    return screen;
  }

  /** Отрисовать экран и применить его декларативные настройки оболочки. */
  showScreen(screenId) {
    const screen = this.getScreen(screenId);
    this.currentScreenId = screen.id;

    if (this.player && screen.playerLocationId) {
      this.player.location = screen.playerLocationId;
    }

    this.screenContainer.className = screen.cssClass;
    screen.render(this.screenContainer);

    document.getElementById('hud-wrap').style.display = screen.showsHud ? 'flex' : 'none';
    this.setGameNavigationVisible(screen.showsGameNavigation);

    if (screen.sessionRestorable && this.player && this.currentSlot) {
      this.saveManager.saveSession(this.currentSlot, screen.id);
    }
  }

  refresh() {
    this.hud.render();
    this.effectsBar.render();
    this.save();
  }

  save() {
    if (this.player && this.currentSlot) {
      this.saveManager.save(this.currentSlot, this.player);
    }
  }

  // ===== Регенерация =====

  /**
   * Тик времени: естественная регенерация HP (везде одинаковая)
   * и эффекты длительных действий — отдых ускоряет реген,
   * сон дополнительно наполняет шкалу сна.
   */
  startRegen() {
    setInterval(() => {
      const player = this.player;
      if (!player || this.inCombat) return;

      const actionActive = this.activeAction !== null;
      let changed = false;

      // Реген HP: процент от максимума; отдых ×3, сон ×4
      if (player.hp < player.maxHp) {
        const multiplier =
          this.activeAction === 'rest' ? BALANCE.rest.restMultiplier :
          this.activeAction === 'sleep' ? BALANCE.rest.sleepMultiplier : 1;
        const rate = Math.max(1, Math.round(player.maxHp * BALANCE.regen.percentPerTick * multiplier));

        player.hp = Math.min(player.maxHp, player.hp + rate);
        changed = true;
      }

      // Сон наполняет свою шкалу
      if (this.activeAction === 'sleep' && player.needs.sleep < BALANCE.needs.max) {
        player.needs.sleep = Math.min(BALANCE.needs.max, player.needs.sleep + BALANCE.rest.sleepPerTick);
        changed = true;
      }

      if (this.activeAction === 'mine') {
        const earnedGold = Mining.workTick(player);
        this.openModal?.recordEarnings(earnedGold);
        changed = true;
      }

      const enemiesRegenerated = player.arenaLineup.regenerateEnemies(BALANCE.regen.percentPerTick);
      if (enemiesRegenerated) {
        changed = true;
      }

      if (changed) {
        this.hud.render();
        if (actionActive) {
          this.effectsBar.render();     // порог сна мог включить/выключить бафф
          this.openModal?.refresh();    // живой прогресс в окне действия
        }
        if (enemiesRegenerated && this.currentScreenId === 'arena') {
          this.screens.arena.refreshOpponentHealth();
        }
        this.save();
      }

      this.finishActionIfDone();
    }, BALANCE.regen.intervalMs);
  }

  /** Автозавершение действий: HP полон — отдых окончен, сон полон — герой выспался. */
  finishActionIfDone() {
    const player = this.player;

    if (this.activeAction === 'rest' && player.hp >= player.maxHp) {
      this.openModal?.close();
      this.toast('Герой відпочив — повний сил!');
    } else if (this.activeAction === 'sleep' && player.needs.sleep >= BALANCE.needs.max) {
      this.openModal?.close();
      this.toast('Герой виспався!');
    }
  }

  // ===== Вспомогательный интерфейс =====

  /**
   * Кнопки навигации: карта (правый верхний угол), шестерёнка меню
   * (левый нижний) и «Персонаж»/«Инвентарь» под панелью героя —
   * доступны из любой локации, кроме боя.
   */
  renderNav() {
    const mapNav = document.getElementById('map-button');
    mapNav.innerHTML = `<button class="btn btn--nav" id="nav-map">${Hud.icon('map')}<span>Мапа</span></button>`;
    mapNav.querySelector('#nav-map').addEventListener('click', () => this.modals.map.open());

    const menuNav = document.getElementById('menu-button');
    menuNav.innerHTML = `
      <button class="btn btn--icon" id="nav-menu" title="Вийти в головне меню (Esc)" aria-label="Головне меню">${Hud.icon('menu')}</button>
    `;
    menuNav.querySelector('#nav-menu').addEventListener('click', () => this.exitToMenu());

    const hudActions = document.getElementById('hud-actions');
    hudActions.innerHTML = `
      <button class="btn btn--icon" id="nav-stats" title="Характеристики" aria-label="Характеристики">${Hud.icon('stats')}</button>
      <button class="btn btn--icon" id="nav-inventory" title="Інвентар" aria-label="Інвентар">${Hud.icon('inventory')}</button>
      <button class="btn btn--icon" id="nav-equipment" title="Спорядження" aria-label="Спорядження">${Hud.icon('equipment')}</button>
    `;
    hudActions.querySelector('#nav-stats').addEventListener('click', () => this.modals.stats.open());
    hudActions.querySelector('#nav-inventory').addEventListener('click', () => this.modals.inventory.open());
    hudActions.querySelector('#nav-equipment').addEventListener('click', () => this.modals.equipment.open());
  }

  setGameNavigationVisible(visible) {
    this.gameNavigationVisible = visible;
    document.getElementById('map-button').style.display = visible ? 'flex' : 'none';
    document.getElementById('menu-button').style.display = visible ? 'block' : 'none';
    // Во время боя инвентарь и персонаж тоже недоступны
    document.getElementById('hud-actions').style.display = visible ? 'flex' : 'none';
  }

  /** Модальное подтверждение опасного действия. */
  confirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="panel result-panel">
        <p class="confirm-text">${message}</p>
        <div class="confirm-buttons">
          <button class="btn btn--primary" id="confirm-yes">Так</button>
          <button class="btn" id="confirm-no">Скасувати</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-yes').addEventListener('click', () => {
      overlay.remove();
      onConfirm();
    });
    overlay.querySelector('#confirm-no').addEventListener('click', () => overlay.remove());
  }

  /** Короткое всплывающее сообщение внизу экрана. */
  toast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('toast--visible');

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 2500);
  }
}
