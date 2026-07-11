/**
 * ПРЕДМЕТЫ: РЕДКОСТЬ, АСПЕКТЫ, СЛОТЫ, ИМЕНА
 * ------------------------------------------
 * Правила по спеке (п. 5.2): редкость определяет, СКОЛЬКО аспектов
 * получает предмет и НАСКОЛЬКО большой бонус к каждому.
 */

/**
 * Редкость. variants — возможные комбинации размеров бонусов,
 * одна из которых выбирается случайно при генерации предмета:
 *  - обычный: один малый бонус
 *  - редкий: один средний ИЛИ два малых
 *  - легендарный: один высокий ИЛИ два средних ИЛИ три малых
 */
const RARITIES = {
  common: {
    id: 'common',
    name: 'Звичайний',
    color: '#9aa0a6',
    powerMultiplier: 1,
    baseValue: 45,
    variants: [['small']],
  },
  rare: {
    id: 'rare',
    name: 'Рідкісний',
    color: '#4a9de0',
    powerMultiplier: 1.35,
    baseValue: 175,
    variants: [['medium'], ['small', 'small']],
  },
  legendary: {
    id: 'legendary',
    name: 'Легендарний',
    color: '#e0a520',
    powerMultiplier: 1.8,
    baseValue: 520,
    variants: [['large'], ['medium', 'medium'], ['small', 'small', 'small']],
  },
};

/**
 * Аспекты бонусов (по спеке): характеристика / прямой урон /
 * шанс уклонения / максимальный HP. Значения по размерам бонуса.
 */
const ASPECTS = {
  strength: { name: 'Сила',       small: 2,  medium: 4,  large: 7,  levelGrowth: 0.10, format: v => `+${v} до Сили` },
  agility:  { name: 'Спритність', small: 2,  medium: 4,  large: 7,  levelGrowth: 0.10, format: v => `+${v} до Спритності` },
  vitality: { name: 'Життя',      small: 2,  medium: 4,  large: 7,  levelGrowth: 0.10, format: v => `+${v} до Життя` },
  damage:   { name: 'Урон',       small: 3,  medium: 6,  large: 10, levelGrowth: 0.12, format: v => `+${v} до урону` },
  dodge:    { name: 'Ухилення',   small: 3,  medium: 5,  large: 8,  levelGrowth: 0.04, format: v => `+${v}% до ухилення` },
  maxHp:    { name: 'Макс. HP',   small: 10, medium: 20, large: 35, levelGrowth: 0.12, format: v => `+${v} до макс. HP` },
};

/** Слоты экипировки персонажа. */
const EQUIPMENT_SLOTS = {
  weapon: { id: 'weapon', name: 'Зброя', icon: '🗡️', images: {
    common: 'assets/items/equipment/weapon-common.png', rare: 'assets/items/equipment/weapon-rare.png', legendary: 'assets/items/equipment/weapon-legendary.png',
  } },
  shield: { id: 'shield', name: 'Щит', icon: '🛡️', images: {
    common: 'assets/items/equipment/shield-common.png', rare: 'assets/items/equipment/shield-rare.png', legendary: 'assets/items/equipment/shield-legendary.png',
  } },
  armor: { id: 'armor', name: 'Броня', icon: '🥋', images: {
    common: 'assets/items/equipment/armor-common.png', rare: 'assets/items/equipment/armor-rare.png', legendary: 'assets/items/equipment/armor-legendary.png',
  } },
  helmet: { id: 'helmet', name: 'Шолом', icon: '🪖', images: {
    common: 'assets/items/equipment/helmet-common.png', rare: 'assets/items/equipment/helmet-rare.png', legendary: 'assets/items/equipment/helmet-legendary.png',
  } },
  boots: { id: 'boots', name: 'Взуття', icon: '🥾', images: {
    common: 'assets/items/equipment/boots-common.png', rare: 'assets/items/equipment/boots-rare.png', legendary: 'assets/items/equipment/boots-legendary.png',
  } },
};

/** Имена для генерации дропа: слот × редкость. */
const ITEM_NAME_POOLS = {
  weapon: {
    common:    ['Іржавий меч', 'Тупий тесак', 'Старий клинок'],
    rare:      ['Клинок вітру', 'Шабля дуелянта', 'Зазубрений фальшион'],
    legendary: ['Меч короля орків', 'Клинок безодні', 'Погибель демонів'],
  },
  shield: {
    common:    ['Тріснутий щит', 'Дерев\'яний круглий щит'],
    rare:      ['Щит стража', 'Окутий щит гладіатора'],
    legendary: ['Щит останнього легіону', 'Егіда арени'],
  },
  armor: {
    common:    ['Латана куртка', 'Шкіряний нагрудник'],
    rare:      ['Кольчуга ветерана', 'Панцир найманця'],
    legendary: ['Лати дракона', 'Обладунок чемпіона'],
  },
  helmet: {
    common:    ['Пом\'ятий шолом', 'Шкіряний каптур'],
    rare:      ['Шолом центуріона', 'Рогатий шолом'],
    legendary: ['Корона гладіатора', 'Шолом короля-воїна'],
  },
  boots: {
    common:    ['Стоптані чоботи', 'Кожані сандалі'],
    rare:      ['Сапоги-скороходи', 'Чоботи дуелянта'],
    legendary: ['Чоботи буревію', 'Поступ титана'],
  },
};

/** Еда и вода, которые могут выпасть с противника. */
const FOOD_DROPS = [
  { templateId: 'drop-meat', name: 'Шматок м\'яса', icon: '🍖', image: 'assets/items/consumables/drop-meat.png', rarity: 'rare', levelScaled: false, effect: { hunger: 28 }, price: 15 },
  { templateId: 'bread', name: 'Хлібина', icon: '🍞', image: 'assets/items/consumables/bread.png', rarity: 'common', levelScaled: false, effect: { hunger: 18 }, price: 8 },
  { templateId: 'water-flask', name: 'Фляга води', icon: '🥤', image: 'assets/items/consumables/water-flask.png', rarity: 'common', levelScaled: false, effect: { thirst: 24 }, price: 6 },
];
