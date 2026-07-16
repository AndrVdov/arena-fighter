/**
 * РАСЫ ПРОТИВНИКОВ
 * ----------------
 * Каждая раса задаёт постоянные модификаторы базовых характеристик,
 * распределение очков противника, шанс появления и короткий лор.
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
    playerPortrait: 'assets/player/hero.webp',
    name: 'Людина',
    enemyName: 'Людина-розбійник',
    lore: 'Універсальні бандити з арени. Нічим не вирізняються — і тим небезпечні.',
    statModifiers: {},
    statWeights: { strength: 0.34, agility: 0.33, vitality: 0.33 },
    spawnWeight: 20,
  },

  orc: {
    id: 'orc',
    icon: '👹',
    portrait: 'assets/enemies/orc.webp',
    playerPortrait: 'assets/player/orc.webp',
    name: 'Орк',
    lore: 'Груба фізична сила. Б\'є рідко, але влучання ламає кістки.',
    statModifiers: { strength: 0.25, agility: -0.15, vitality: 0.10 },
    statWeights: { strength: 0.45, agility: 0.20, vitality: 0.35 },
    spawnWeight: 20,
  },

  goblin: {
    id: 'goblin',
    icon: '👺',
    portrait: 'assets/enemies/goblin.webp',
    playerPortrait: 'assets/player/goblin.webp',
    name: 'Гоблін',
    lore: 'Юркий, але крихкий. Спробуй спершу влучити по ньому.',
    statModifiers: { strength: -0.20, agility: 0.10, vitality: -0.15 },
    statWeights: { strength: 0.30, agility: 0.50, vitality: 0.20 },
    spawnWeight: 20,
  },

  undead: {
    id: 'undead',
    icon: '💀',
    portrait: 'assets/enemies/undead.webp',
    playerPortrait: 'assets/player/undead.webp',
    name: 'Нежить',
    lore: 'Скелети й зомбі: живучі, але неповороткі. Мертве не поспішає.',
    ignoresNeeds: true,
    traitText: 'Не потребує їжі, води та сну',
    statModifiers: { agility: -0.20, vitality: 0.30 },
    statWeights: { strength: 0.30, agility: 0.15, vitality: 0.55 },
    spawnWeight: 20,
  },

  elf: {
    id: 'elf',
    icon: '🧝',
    portrait: 'assets/enemies/elf.webp',
    playerPortrait: 'assets/player/elf.webp',
    name: 'Ельф',
    lore: 'Точний і швидкий боєць, що покладається на спритність.',
    statModifiers: { agility: 0.25, vitality: -0.10 },
    statWeights: { strength: 0.25, agility: 0.50, vitality: 0.25 },
    spawnWeight: 15,
  },

  demon: {
    id: 'demon',
    icon: '😈',
    portrait: 'assets/enemies/demon.webp',
    playerPortrait: 'assets/player/demon.webp',
    name: 'Демон',
    lore: 'Рідкісний і небезпечний супротивник. Сильний у всьому.',
    statModifiers: { strength: 0.20, agility: 0.10, vitality: 0.15 },
    statWeights: { strength: 0.37, agility: 0.33, vitality: 0.30 },
    spawnWeight: 5,
  },
};
