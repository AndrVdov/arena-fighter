/**
 * СОХРАНЕНИЕ ПРОГРЕССА
 * --------------------
 * Шесть слотов сохранений в localStorage. Каждый слот хранит
 * версию формата, время сохранения и снимок игрока.
 */
class SaveManager {

  static SLOT_COUNT = 6;
  static VERSION = 1;

  /** Ключ старого односейвового формата — мигрирует в слот 1. */
  static LEGACY_KEY = 'arena-fighter-save';
  static SESSION_KEY = 'arena-fighter-session';
  static LAST_SLOT_KEY = 'arena-fighter-last-slot';

  constructor() {
    this.migrateLegacySave();
  }

  static slotKey(slot) {
    return `arena-fighter-slot-${slot}`;
  }

  /** Сохранить игрока в слот. */
  save(slot, player) {
    const record = {
      version: SaveManager.VERSION,
      savedAt: Date.now(),
      player: player.toJSON(),
    };
    localStorage.setItem(SaveManager.slotKey(slot), JSON.stringify(record));
  }

  /** Прочитать слот. Вернёт null, если пусто или запись повреждена. */
  load(slot) {
    const raw = localStorage.getItem(SaveManager.slotKey(slot));
    if (!raw) return null;

    try {
      const record = JSON.parse(raw);
      return record.player ? record : null;
    } catch {
      console.warn(`SaveManager: повреждённое сохранение в слоте ${slot}.`);
      return null;
    }
  }

  /** Удалить сохранение слота. */
  clear(slot) {
    localStorage.removeItem(SaveManager.slotKey(slot));

    // Удалённый герой не должен оставаться целью автовхода.
    if (this.loadSession()?.slot === slot) this.clearSession();
  }

  /** Запомнить активного героя и открытый игровой экран. */
  saveSession(slot, screen) {
    localStorage.setItem(SaveManager.SESSION_KEY, JSON.stringify({ slot, screen }));
    localStorage.setItem(SaveManager.LAST_SLOT_KEY, String(slot));
  }

  /** Последний выбранный слот сохраняется даже после явного выхода в меню. */
  lastSlot() {
    const slot = Number(localStorage.getItem(SaveManager.LAST_SLOT_KEY));
    return Number.isInteger(slot) && slot >= 1 && slot <= SaveManager.SLOT_COUNT
      ? slot
      : null;
  }

  /** Прочитать последнюю сессию или вернуть null, если запись некорректна. */
  loadSession() {
    const raw = localStorage.getItem(SaveManager.SESSION_KEY);
    if (!raw) return null;

    try {
      const session = JSON.parse(raw);
      const validSlot = Number.isInteger(session.slot)
        && session.slot >= 1
        && session.slot <= SaveManager.SLOT_COUNT;

      if (validSlot && typeof session.screen === 'string') return session;

      this.clearSession();
      return null;
    } catch {
      console.warn('SaveManager: повреждена запись последней сессии.');
      this.clearSession();
      return null;
    }
  }

  /** Отключить автовход — используется при явном выходе в меню. */
  clearSession() {
    localStorage.removeItem(SaveManager.SESSION_KEY);
  }

  /** Все слоты для экрана меню: [{ slot, data|null }]. */
  slots() {
    const list = [];
    for (let slot = 1; slot <= SaveManager.SLOT_COUNT; slot++) {
      list.push({ slot, data: this.load(slot) });
    }
    return list;
  }

  /**
   * Перенос сохранения старого формата (один сейв без слотов)
   * в слот 1, чтобы прогресс игрока не потерялся.
   */
  migrateLegacySave() {
    const legacy = localStorage.getItem(SaveManager.LEGACY_KEY);
    if (!legacy) return;

    if (!localStorage.getItem(SaveManager.slotKey(1))) {
      try {
        const record = {
          version: SaveManager.VERSION,
          savedAt: Date.now(),
          player: JSON.parse(legacy),
        };
        localStorage.setItem(SaveManager.slotKey(1), JSON.stringify(record));
      } catch {
        console.warn('SaveManager: старое сохранение повреждено, пропускаем.');
      }
    }
    localStorage.removeItem(SaveManager.LEGACY_KEY);
  }
}
