/**
 * СОСТАВ АРЕНЫ
 * -------------
 * Каждая трёхуровневая комната хранит четыре независимых ростера и свой
 * список мести. Регулярные ростеры всех открытых комнат обновляются одним
 * общим таймером; записи мести сохраняют личные сроки жизни.
 */
class ArenaLineup {

  static REGULAR_ROSTERS = ['rookies', 'common', 'champions', 'kings'];

  constructor(data = {}, playerLevel = 1) {
    const hasRoomModel = data.rooms && typeof data.rooms === 'object';
    this.rooms = hasRoomModel
      ? ArenaLineup.loadRooms(data.rooms)
      : ArenaLineup.migrateToRooms(data, playerLevel);
    this.refreshAt = hasRoomModel ? data.refreshAt ?? 0 : 0;
    this.ensureRooms(playerLevel);
    this.purgeExpiredRevenge();
  }

  get isExpired() { return Date.now() >= this.refreshAt; }
  get msLeft() { return Math.max(0, this.refreshAt - Date.now()); }

  static roomIndexForLevel(level) {
    return Math.floor((Item.normalizeLevel(level) - 1) / BALANCE.arena.levelSegmentSize);
  }

  static roomInfo(index) {
    const normalizedIndex = Math.max(0, Math.floor(Number(index) || 0));
    const minimum = normalizedIndex * BALANCE.arena.levelSegmentSize + 1;
    const maximum = minimum + BALANCE.arena.levelSegmentSize - 1;
    return {
      id: `room-${minimum}-${maximum}`,
      index: normalizedIndex,
      minimum,
      maximum,
      label: `${minimum}–${maximum}`,
    };
  }

  static roomForLevel(level) {
    return ArenaLineup.roomInfo(ArenaLineup.roomIndexForLevel(level));
  }

  static availableRooms(level) {
    const currentIndex = ArenaLineup.roomIndexForLevel(level);
    return Array.from({ length: currentIndex + 1 }, (_, index) => ArenaLineup.roomInfo(index));
  }

  /** Создать недостающие открытые комнаты, не сдвигая общий таймер. */
  ensureRooms(playerLevel) {
    let changed = false;
    for (const info of ArenaLineup.availableRooms(playerLevel)) {
      if (this.rooms[info.id]) continue;
      this.rooms[info.id] = ArenaLineup.emptyRoom(info.index);
      if (!this.isExpired) this.rooms[info.id].rosters = this.rollRoomRosters(info.index);
      changed = true;
    }
    return changed;
  }

  getRoom(roomId) {
    return this.rooms[roomId] ?? null;
  }

  getSlots(roomId, tabId) {
    const room = this.getRoom(roomId);
    if (!room) return [];
    if (tabId === 'revenge') return room.revenge.map(entry => entry.enemy);
    return room.rosters[tabId] ?? [];
  }

  getEnemy(roomId, tabId, index) {
    return this.getSlots(roomId, tabId)[index] ?? null;
  }

  count(roomId, tabId) {
    return this.getSlots(roomId, tabId).filter(Boolean).length;
  }

  revengeExpiresAt(roomId, enemy) {
    return this.getRoom(roomId)?.revenge
      .find(entry => entry.enemy === enemy)?.expiresAt ?? 0;
  }

  /** Обновить регулярные составы всех открытых комнат одним циклом. */
  refresh(playerLevel) {
    this.ensureRooms(playerLevel);
    for (const room of Object.values(this.rooms)) {
      room.rosters = this.rollRoomRosters(room.index);
    }
    this.refreshAt = Date.now() + BALANCE.arena.refreshSeconds * 1000;
    this.purgeExpiredRevenge();
  }

  rollRoomRosters(roomIndex) {
    const cfg = BALANCE.arena;
    return {
      rookies: this.rollRoster(roomIndex, 'rookie', 1),
      common: this.rollRoster(roomIndex, 'common', 1),
      champions: this.rollRoster(roomIndex, 'elite', cfg.championSlotChance),
      kings: this.rollRoster(roomIndex, 'king', cfg.kingSlotChance),
    };
  }

  rollRoster(roomIndex, eliteId, fillChance) {
    return Array.from({ length: BALANCE.arena.slotsPerRoster }, () => {
      if (Math.random() >= fillChance) return null;
      return Enemy.random(ArenaLineup.rollLevelForRoom(roomIndex), eliteId);
    });
  }

  static rollLevelForRoom(roomIndex, random = Math.random) {
    const info = ArenaLineup.roomInfo(roomIndex);
    return info.minimum + Math.floor(random() * BALANCE.arena.levelSegmentSize);
  }

  remove(enemy) {
    for (const room of Object.values(this.rooms)) {
      for (const roster of Object.values(room.rosters)) {
        const index = roster.indexOf(enemy);
        if (index !== -1) roster[index] = null;
      }
      room.revenge = room.revenge.filter(entry => entry.enemy !== enemy);
    }
  }

  /** Заменить бойца в его комнате и слоте или записи мести. */
  replace(currentEnemy, updatedEnemy) {
    for (const room of Object.values(this.rooms)) {
      for (const roster of Object.values(room.rosters)) {
        const index = roster.indexOf(currentEnemy);
        if (index !== -1) {
          roster[index] = updatedEnemy;
          return true;
        }
      }
      const revengeEntry = room.revenge.find(entry => entry.enemy === currentEnemy);
      if (revengeEntry) {
        revengeEntry.enemy = updatedEnemy;
        return true;
      }
    }
    return false;
  }

  roomIdForEnemy(enemy) {
    for (const [roomId, room] of Object.entries(this.rooms)) {
      const inRoster = Object.values(room.rosters).some(roster => roster.includes(enemy));
      if (inRoster || room.revenge.some(entry => entry.enemy === enemy)) return roomId;
    }
    return null;
  }

  /** Победитель игрока покидает ростер и попадает в месть той же комнаты. */
  moveToRevenge(currentEnemy, updatedEnemy) {
    const roomId = this.roomIdForEnemy(currentEnemy);
    if (!roomId) return false;

    this.remove(currentEnemy);
    this.remove(updatedEnemy);
    this.rooms[roomId].revenge.push({
      enemy: updatedEnemy,
      expiresAt: Date.now() + BALANCE.arena.revengeLifetimeSeconds * 1000,
    });
    return true;
  }

  purgeExpiredRevenge(now = Date.now()) {
    let removed = 0;
    for (const room of Object.values(this.rooms)) {
      const before = room.revenge.length;
      room.revenge = room.revenge.filter(entry => entry.expiresAt > now);
      removed += before - room.revenge.length;
    }
    return removed;
  }

  /** Естественная регенерация всех выживших противников во всех комнатах. */
  regenerateEnemies(percentPerTick, now = Date.now()) {
    let changed = false;
    const regularEnemies = Object.values(this.rooms)
      .flatMap(room => Object.values(room.rosters).flat())
      .filter(Boolean);
    const revengeEnemies = Object.values(this.rooms)
      .flatMap(room => room.revenge)
      .filter(entry => entry.expiresAt > now)
      .map(entry => entry.enemy);

    for (const enemy of new Set([...regularEnemies, ...revengeEnemies])) {
      if (enemy.hp >= enemy.maxHp) continue;

      const baseAmount = Math.max(1, Math.round(enemy.maxHp * percentPerTick));
      const amount = enemy.recoveryAmount(baseAmount, 'hp');
      if (amount <= 0) continue;

      enemy.hp = Math.min(enemy.maxHp, enemy.hp + amount);
      if (enemy.hp >= enemy.maxHp) enemy.clearRecoveryProgress('hp');
      changed = true;
    }
    return changed;
  }

  toJSON() {
    return {
      rooms: Object.fromEntries(Object.entries(this.rooms).map(([roomId, room]) => [
        roomId,
        {
          index: room.index,
          rosters: Object.fromEntries(Object.entries(room.rosters).map(([id, slots]) => [
            id,
            slots.map(enemy => enemy ? enemy.toJSON() : null),
          ])),
          revenge: room.revenge.map(entry => ({
            enemy: entry.enemy.toJSON(),
            expiresAt: entry.expiresAt,
          })),
        },
      ])),
      refreshAt: this.refreshAt,
    };
  }

  static emptyRosters() {
    return Object.fromEntries(ArenaLineup.REGULAR_ROSTERS.map(id => [
      id,
      Array(BALANCE.arena.slotsPerRoster).fill(null),
    ]));
  }

  static emptyRoom(index) {
    return { index, rosters: ArenaLineup.emptyRosters(), revenge: [] };
  }

  static loadRooms(data) {
    return Object.fromEntries(Object.entries(data).map(([roomId, roomData]) => {
      const index = Math.max(0, Math.floor(Number(roomData?.index) || 0));
      return [roomId, {
        index,
        rosters: Object.fromEntries(ArenaLineup.REGULAR_ROSTERS.map(id => [
          id,
          ArenaLineup.loadSlots(roomData?.rosters?.[id]),
        ])),
        revenge: ArenaLineup.loadRevenge(roomData?.revenge),
      }];
    }));
  }

  static loadSlots(data = []) {
    return Array.from({ length: BALANCE.arena.slotsPerRoster }, (_, index) =>
      data[index] ? Enemy.fromJSON(data[index]) : null);
  }

  static loadRevenge(data = []) {
    return data.map(entry => ({
      enemy: Enemy.fromJSON(entry.enemy ?? entry),
      expiresAt: entry.expiresAt
        ?? Date.now() + BALANCE.arena.revengeLifetimeSeconds * 1000,
    }));
  }

  /** Старый единый список мести переносится в текущую комнату героя. */
  static migrateToRooms(data, playerLevel) {
    const info = ArenaLineup.roomForLevel(playerLevel);
    const room = ArenaLineup.emptyRoom(info.index);
    room.revenge = ArenaLineup.loadRevenge(data.revenge);
    return { [info.id]: room };
  }
}
