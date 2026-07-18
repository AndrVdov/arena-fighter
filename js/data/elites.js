/**
 * ЗВАНИЯ ПРОТИВНИКОВ
 * ------------------
 * Звание не усиливает характеристики. Оно определяет достаток персонажа:
 * сколько вещей и расходников он получил при создании, какой редкости они
 * могут быть и сколько золота он носит. Множители опыта хранятся в балансе.
 */
const ELITES = {

  rookie: {
    id: 'rookie',
    badge: '⚪',
    name: 'Салага',
    equipment: {
      mode: 'random',
      countWeights: { 0: 25, 1: 50, 2: 22, 3: 3 },
      rarity: 'common',
    },
    inventoryRarities: ['common'],
    inventoryCountWeights: { 0: 55, 1: 40, 2: 5 },
    goldPerLevel: [2, 4],
    goldBase: 2,
    spawnWeight: 0,
  },

  common: {
    id: 'common',
    badge: '🟢',
    name: 'Простий',
    equipment: { mode: 'full', rarity: 'common' },
    inventoryRarities: ['common'],
    inventoryCountWeights: { 0: 55, 1: 40, 2: 5 },
    goldPerLevel: [2, 4],
    goldBase: 2,
    spawnWeight: 70,
  },

  elite: {
    id: 'elite',
    badge: '🟣',
    name: 'Елітний',
    equipment: { mode: 'full', rarity: 'rare' },
    inventoryRarities: ['common', 'rare'],
    inventoryCountWeights: { 0: 20, 1: 50, 2: 25, 3: 5 },
    goldPerLevel: [4, 7],
    goldBase: 5,
    spawnWeight: 25,
  },

  king: {
    id: 'king',
    badge: '👑',
    name: 'Король',
    equipment: { mode: 'full', rarity: 'legendary' },
    inventoryRarities: ['common', 'rare', 'legendary'],
    inventoryCountWeights: { 1: 25, 2: 45, 3: 25, 4: 5 },
    goldPerLevel: [7, 12],
    goldBase: 10,
    spawnWeight: 5,
  },
};
