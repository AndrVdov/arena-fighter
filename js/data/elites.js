/**
 * ЗВАНИЯ ПРОТИВНИКОВ
 * ------------------
 * Звание не усиливает характеристики и награды множителями. Оно определяет
 * только достаток персонажа: сколько вещей и расходников он получил при
 * создании, какой редкости они могут быть и сколько золота он носит.
 */
const ELITES = {

  common: {
    id: 'common',
    badge: '🟢',
    name: 'Простий',
    equipmentCountWeights: { 0: 25, 1: 50, 2: 22, 3: 3 },
    equipmentRarityWeights: { common: 100 },
    inventoryCountWeights: { 0: 55, 1: 40, 2: 5 },
    goldPerLevel: [2, 4],
    goldBase: 2,
    spawnWeight: 70,
  },

  elite: {
    id: 'elite',
    badge: '🟣',
    name: 'Елітний',
    equipmentCountWeights: { 0: 5, 1: 35, 2: 45, 3: 15 },
    equipmentRarityWeights: { common: 82, rare: 18 },
    inventoryCountWeights: { 0: 20, 1: 50, 2: 25, 3: 5 },
    goldPerLevel: [4, 7],
    goldBase: 5,
    spawnWeight: 25,
  },

  king: {
    id: 'king',
    badge: '👑',
    name: 'Король',
    equipmentCountWeights: { 1: 10, 2: 45, 3: 35, 4: 10 },
    equipmentRarityWeights: { common: 20, rare: 75, legendary: 5 },
    inventoryCountWeights: { 1: 25, 2: 45, 3: 25, 4: 5 },
    goldPerLevel: [7, 12],
    goldBase: 10,
    spawnWeight: 5,
  },
};
