/**
 * РАСЫ ПРОТИВНИКОВ
 * ----------------
 * Каждая раса задаёт распределение характеристик (сумма весов = 1),
 * шанс появления на арене и короткий лор.
 *
 * statWeights — вероятность вложить каждое доступное очко в характеристику.
 * Это приоритет, а не жёсткая пропорция: персонажи одной расы и уровня
 * получают одинаковую сумму очков, но разные конкретные распределения.
 */
const RACES = {

  bandit: {
    id: 'bandit',
    icon: '🥷',
    portrait: 'assets/enemies/bandit.webp',
    name: 'Людина-розбійник',
    lore: 'Універсальні бандити з арени. Нічим не вирізняються — і тим небезпечні.',
    statWeights: { strength: 0.34, agility: 0.33, vitality: 0.33 },
    spawnWeight: 20,
  },

  orc: {
    id: 'orc',
    icon: '👹',
    portrait: 'assets/enemies/orc.webp',
    name: 'Орк',
    lore: 'Груба фізична сила. Б\'є рідко, але влучання ламає кістки.',
    statWeights: { strength: 0.45, agility: 0.20, vitality: 0.35 },
    spawnWeight: 20,
  },

  goblin: {
    id: 'goblin',
    icon: '👺',
    portrait: 'assets/enemies/goblin.webp',
    name: 'Гоблін',
    lore: 'Юркий, але крихкий. Спробуй спершу влучити по ньому.',
    statWeights: { strength: 0.30, agility: 0.50, vitality: 0.20 },
    spawnWeight: 20,
  },

  undead: {
    id: 'undead',
    icon: '💀',
    portrait: 'assets/enemies/undead.webp',
    name: 'Нежить',
    lore: 'Скелети й зомбі: живучі, але неповороткі. Мертве не поспішає.',
    statWeights: { strength: 0.30, agility: 0.15, vitality: 0.55 },
    spawnWeight: 20,
  },

  elf: {
    id: 'elf',
    icon: '🧝',
    portrait: 'assets/enemies/elf.webp',
    name: 'Ельф-вигнанець',
    lore: 'Точний і швидкий боєць, вигнаний власним народом на арену.',
    statWeights: { strength: 0.25, agility: 0.50, vitality: 0.25 },
    spawnWeight: 15,
  },

  demon: {
    id: 'demon',
    icon: '😈',
    portrait: 'assets/enemies/demon.webp',
    name: 'Демон',
    lore: 'Рідкісний і небезпечний супротивник. Сильний у всьому.',
    statWeights: { strength: 0.37, agility: 0.33, vitality: 0.30 },
    spawnWeight: 5,
  },
};
