/**
 * СОСТАВ АРЕНЫ
 * -------------
 * Три обновляемых ростера по четыре слота и отдельный неограниченный список
 * мести. Пустой слот хранится как null, поэтому его позиция сохраняется.
 */
class ArenaLineup {

  constructor(data = {}) {
    this.rosters = data.rosters
      ? {
          common: ArenaLineup.loadSlots(data.rosters.common),
          champions: ArenaLineup.loadSlots(data.rosters.champions),
          kings: ArenaLineup.loadSlots(data.rosters.kings),
        }
      : ArenaLineup.migrateLegacy(data.enemies ?? []);

    this.revenge = (data.revenge ?? []).map(entry => ({
      enemy: Enemy.fromJSON(entry.enemy ?? entry),
      expiresAt: entry.expiresAt ?? Date.now() + BALANCE.arena.revengeLifetimeSeconds * 1000,
    }));
    this.refreshAt = data.refreshAt ?? 0;
    this.purgeExpiredRevenge();
  }

  get isExpired() { return Date.now() >= this.refreshAt; }
  get msLeft() { return Math.max(0, this.refreshAt - Date.now()); }

  getSlots(tabId) {
    if (tabId === 'revenge') return this.revenge.map(entry => entry.enemy);
    return this.rosters[tabId] ?? [];
  }

  getEnemy(tabId, index) {
    return this.getSlots(tabId)[index] ?? null;
  }

  count(tabId) {
    return this.getSlots(tabId).filter(Boolean).length;
  }

  revengeExpiresAt(enemy) {
    return this.revenge.find(entry => entry.enemy === enemy)?.expiresAt ?? 0;
  }

  /** Одновременно обновить три регулярных раздела. */
  refresh(playerLevel) {
    const cfg = BALANCE.arena;
    this.rosters.common = this.rollRoster(playerLevel, 'common', 1);
    this.rosters.champions = this.rollRoster(playerLevel, 'elite', cfg.championSlotChance);
    this.rosters.kings = this.rollRoster(playerLevel, 'king', cfg.kingSlotChance);
    this.refreshAt = Date.now() + cfg.refreshSeconds * 1000;
    this.purgeExpiredRevenge();
  }

  rollRoster(playerLevel, eliteId, fillChance) {
    return Array.from({ length: BALANCE.arena.slotsPerRoster }, (_, index) => {
      if (Math.random() >= fillChance) return null;
      const offsets = BALANCE.enemy.levelOffsets;
      const offset = offsets[index % offsets.length];
      return Enemy.random(Math.max(1, playerLevel + offset), eliteId);
    });
  }

  remove(enemy) {
    for (const roster of Object.values(this.rosters)) {
      const index = roster.indexOf(enemy);
      if (index !== -1) roster[index] = null;
    }
    this.revenge = this.revenge.filter(entry => entry.enemy !== enemy);
  }

  /** Заменить бойца в том же слоте или записи мести. */
  replace(currentEnemy, updatedEnemy) {
    for (const roster of Object.values(this.rosters)) {
      const index = roster.indexOf(currentEnemy);
      if (index !== -1) {
        roster[index] = updatedEnemy;
        return true;
      }
    }
    const revengeEntry = this.revenge.find(entry => entry.enemy === currentEnemy);
    if (!revengeEntry) return false;
    revengeEntry.enemy = updatedEnemy;
    return true;
  }

  /** Победитель игрока покидает свой ростер и получает новый личный час. */
  moveToRevenge(currentEnemy, updatedEnemy) {
    this.remove(currentEnemy);
    this.remove(updatedEnemy);
    this.revenge.push({
      enemy: updatedEnemy,
      expiresAt: Date.now() + BALANCE.arena.revengeLifetimeSeconds * 1000,
    });
  }

  purgeExpiredRevenge(now = Date.now()) {
    const before = this.revenge.length;
    this.revenge = this.revenge.filter(entry => entry.expiresAt > now);
    return before - this.revenge.length;
  }

  /** Естественная регенерация всех выживших противников арены. */
  regenerateEnemies(percentPerTick, now = Date.now()) {
    let changed = false;
    const regularEnemies = Object.values(this.rosters).flat().filter(Boolean);
    const revengeEnemies = this.revenge
      .filter(entry => entry.expiresAt > now)
      .map(entry => entry.enemy);
    for (const enemy of new Set([...regularEnemies, ...revengeEnemies])) {
      if (enemy.hp >= enemy.maxHp) continue;

      const amount = Math.max(1, Math.round(enemy.maxHp * percentPerTick));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + amount);
      changed = true;
    }
    return changed;
  }

  toJSON() {
    return {
      rosters: Object.fromEntries(Object.entries(this.rosters).map(([id, slots]) => [
        id,
        slots.map(enemy => enemy ? enemy.toJSON() : null),
      ])),
      revenge: this.revenge.map(entry => ({
        enemy: entry.enemy.toJSON(),
        expiresAt: entry.expiresAt,
      })),
      refreshAt: this.refreshAt,
    };
  }

  static loadSlots(data = []) {
    return Array.from({ length: BALANCE.arena.slotsPerRoster }, (_, index) =>
      data[index] ? Enemy.fromJSON(data[index]) : null);
  }

  static migrateLegacy(enemies) {
    const rosters = {
      common: Array(BALANCE.arena.slotsPerRoster).fill(null),
      champions: Array(BALANCE.arena.slotsPerRoster).fill(null),
      kings: Array(BALANCE.arena.slotsPerRoster).fill(null),
    };
    const nextIndex = { common: 0, champions: 0, kings: 0 };

    enemies.map(Enemy.fromJSON).forEach(enemy => {
      const rosterId = enemy.elite.id === 'elite' ? 'champions'
        : enemy.elite.id === 'king' ? 'kings' : 'common';
      const index = nextIndex[rosterId]++;
      if (index < BALANCE.arena.slotsPerRoster) rosters[rosterId][index] = enemy;
    });
    return rosters;
  }
}
