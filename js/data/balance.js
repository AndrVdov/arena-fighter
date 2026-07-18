/**
 * БАЛАНС ИГРЫ
 * -----------
 * Все числа и формулы собраны здесь, чтобы баланс можно было
 * править в одном месте, не трогая логику игры.
 */
const BALANCE = {

  // Стартовый персонаж
  player: {
    baseStats: {
      strength: 5,   // Сила — урон от ударов
      agility: 5,    // Ловкость — шанс крита и уворота
      vitality: 5,   // Жизнь — влияет на максимальный запас HP
    },
    baseHp: 50,            // базовый запас HP без учёта Жизни
    hpPerVitality: 10,     // сколько HP даёт каждая единица Жизни
    startGold: 20,         // золото нового персонажа
    statPointsPerLevel: 3, // очков характеристик за каждый уровень
    startFreePoints: 3,    // свободные очки при создании персонажа
  },

  // Опыт: сколько XP нужно для следующего уровня.
  // Формула: baseXp * growth^(уровень - 1)
  xp: {
    baseXp: 100,
    growth: 1.4,
    lethalVictoryMultiplier: 3,
    lethalDefeatLossRate: 0.10,
    enemyRankMultipliers: {
      rookie: 1 / 3,
    },
  },

  // Шкалы потребностей (голод / жажда / сон), значения 0..max.
  // Каждая шкала влияет на СВОЮ характеристику (см. Needs.LABELS):
  //   голод → Сила, жажда → Ловкость, сон → Жизнь.
  needs: {
    max: 100,
    start: 100,
    fixedRaceValue: 50,
    buffAbove: 70,      // шкала ≥ 70 → бонус к своей характеристике
    debuffBelow: 20,    // шкала ≤ 20 → штраф
    bonusPercent: 0.10, // размер бонуса/штрафа: 10% от характеристики (минимум 1)
    costPerFight: { hunger: 6, thirst: 8, sleep: 5 }, // расход за бой
  },

  // Любой маршрут пока одинаков: короткая реальная пауза и 15 минут мира.
  travel: {
    durationMs: 3000,
    gameMinutes: 15,
    needsCost: { hunger: 2, thirst: 3, sleep: 1 },
  },

  storage: {
    itemsPerCategory: 20,
    maxGold: 50000,
  },

  // Естественная регенерация HP: процент от макс. HP за тик,
  // поэтому время полного исцеления не растёт с уровнем.
  regen: {
    intervalMs: 3000,
    percentPerTick: 0.01, // 1% макс. HP за тик (минимум 1 HP)
  },

  audio: {
    defaultVolumes: { enabled: true, master: 0.75, ambience: 0.42, effects: 0.68 },
    sceneFadeSeconds: 1.1,
    miningPickIntervalMs: [700, 1350],
    homeScene: {
      tracks: [
        { src: 'assets/audio/home-fireplace.ogg', gain: 0.58 },
        { src: 'assets/audio/home-wind.ogg', gain: 0.055 },
      ],
    },
    riverScene: {
      tracks: [
        { src: 'assets/audio/river-stream.mp3', gain: 0.48 },
      ],
    },
    shopScene: {
      tracks: [
        { src: 'assets/audio/shop-market.mp3', gain: 0.30 },
      ],
    },
    mineScene: {
      tracks: [
        { src: 'assets/audio/mine-tunnel.mp3', gain: 0.34 },
      ],
    },
    arenaScene: {
      tracks: [
        { src: 'assets/audio/arena-crowd.mp3', gain: 0.30, battleGain: 0.42 },
      ],
    },
    recordedEffects: {
      pick: { src: 'assets/audio/pickaxe-hit.mp3', gain: 0.72 },
    },
    menuScene: {
      tracks: [
        { src: 'assets/audio/arena-crowd.mp3', gain: 0.14 },
      ],
    },
  },

  // Дебафы от низкого здоровья. Проверяются от более тяжёлого к лёгкому.
  healthConditions: {
    nearDeath: {
      threshold: 0.25,
      travelMultiplier: 3,
      recoveryDivisor: 3,
      damageMultiplier: 0.25,
    },
    wounded: {
      threshold: 0.50,
      travelMultiplier: 2,
      recoveryDivisor: 2,
      damageMultiplier: 0.50,
    },
  },

  // Действия дома: отдых и сон — процессы, идущие пока открыто их окно
  rest: {
    restMultiplier: 2,  // отдых: реген ×2 (2% макс. HP за тик)
    sleepMultiplier: 3, // сон: реген ×3 (3% макс. HP за тик)
    sleepPerTick: 1,    // сколько шкалы сна восполняет каждый тик во время сна
  },

  // Работа в шахте: базовый доход и бонус за действующую Силу.
  mining: {
    baseGoldPerTick: 1,
    strengthPerBonusGold: 10,
    goldChancePerTick: 0.50,
    sleepCostPerTick: 3,
  },

  // Боевые формулы
  combat: {
    baseDamage: 3,          // базовый урон любого бойца
    damagePerStrength: 1.5, // урон за единицу Силы
    variance: 0.2,          // разброс урона ±20%

    critMultiplier: 2,      // крит — удвоенный урон (по спеке)
    critBase: 0.10,         // базовый шанс крита
    critPerAgility: 0.02,   // прибавка за каждую единицу разницы Ловкости
    critMin: 0.02,
    critMax: 0.5,

    dodgeBase: 0.08,        // базовый шанс уворота
    dodgePerAgility: 0.02,  // прибавка за каждую единицу разницы Ловкости
    dodgeMin: 0.02,
    dodgeMax: 0.5,

    turnDelayMs: 700,       // пауза между ударами в логе боя
    defeatHp: 1,            // с каким HP игрок выходит из проигранного боя
  },

  // Генерация противников
  enemy: {
    xpBase: 12,             // опыт зависит только от уровня, без множителя звания
    xpPerLevel: 8,
    equipmentLevelOffsets: [0, -1, -2],
    elixirChance: {
      lowerLevel: 0.75,
      equalLevel: 0.50,
      higherLevel: 0.25,
    },
  },

  // Арена: состав противников обновляется сам по таймеру.
  // Побеждённый исчезает из списка; мгновенного обновления нет.
  arena: {
    refreshSeconds: 180,
    slotsPerRoster: 4,
    levelSegmentSize: 3,
    championSlotChance: 0.5,
    kingSlotChance: 0.25,
    revengeLifetimeSeconds: 3600,
  },

  // Масштабирование предметов. Редкость задаёт качество предмета,
  // уровень — рост чисел относительно предметов того же типа и редкости.
  items: {
    consumablePerLevel: 0.10, // лечение: +10% за уровень; еда и вода фиксированы
    buffPerLevel: 0.05,       // сила эликсира: +5% за уровень
    pricePerLevel: 0.15,      // цена: +15% за уровень
    equipmentSellRatio: 0.35,
    consumableSellRatio: 0.50,
    equipment: {
      modelVersion: 2,
      rarity: {
        common: {
          primaryMultiplier: 1,
          secondaryStatCount: 0,
          secondaryStatBase: 0,
          blockChance: 10,
        },
        rare: {
          primaryMultiplier: 1.5,
          secondaryStatCount: 1,
          secondaryStatBase: 1,
          blockChance: 15,
        },
        legendary: {
          primaryMultiplier: 2.2,
          secondaryStatCount: 2,
          secondaryStatBase: 2,
          blockChance: 20,
        },
      },
      primary: {
        weapon: { aspect: 'damage', base: 4, perLevel: 1.1 },
        armor:  { aspect: 'armor', base: 3, perLevel: 0.8 },
        helmet: { aspect: 'armor', base: 2, perLevel: 0.55 },
        boots:  { aspect: 'armor', base: 1, perLevel: 0.45 },
        shield: { aspect: 'blockArmor', base: 6, perLevel: 1.4 },
      },
      secondaryStatLevelStep: 5,
    },
  },

  // Ротация ассортимента снаряжения в магазине
  shop: {
    stockSize: 5,                // сколько предметов в ассортименте
    consumables: {
      modelVersion: 2,
      countWeights: { 2: 15, 3: 25, 4: 30, 5: 20, 6: 10 },
      rarityWeights: { common: 84, rare: 15, legendary: 1 },
    },
    refreshMinutes: 10,          // через сколько минут товар обновляется сам
    rerollCost: 50,              // фиксированная цена обновления всего магазина
    // Как часто какая редкость появляется на прилавке
    rarityWeights: { common: 70, rare: 25, legendary: 5 },
    // Уровень товара относительно героя: чаще равный, иногда соседний.
    levelOffsets: [-1, 0, 0, 0, 1, 1, 2],
    // Цена покупки по редкости: [мин, макс], выбирается случайно
    buyPrice: {
      common:    [30, 60],
      rare:      [150, 250],
      legendary: [450, 650],
    },
  },

  levelUp: {
    fullHeal: true, // при новом уровне персонаж полностью исцеляется
  },
};
