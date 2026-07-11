/**
 * ПОСТОЯННЫЕ ТОВАРЫ МАГАЗИНА (расходники)
 * ---------------------------------------
 * Пулы зелий, эликсиров, еды и воды для ротации магазина.
 * ShopStock выбирает из каждого пула ограниченный ассортимент,
 * который хранится в сейве и обновляется вместе со снаряжением.
 *
 * У расходников поле effect:
 *   hp / hunger / thirst / sleep — восстановление,
 *   buff — временный бафф { stat, value, fights }.
 */
const SHOP_CONSUMABLES = {

  potions: [
    { templateId: 'potion-small', name: 'Мале зілля лікування', icon: '🧪', image: 'assets/items/consumables/potion-small.png', rarity: 'common', effect: { hp: 25 }, price: 15 },
    { templateId: 'potion-large', name: 'Велике зілля лікування', icon: '⚗️', image: 'assets/items/consumables/potion-large.png', rarity: 'rare', effect: { hp: 36 }, price: 34 },
    { templateId: 'potion-royal', name: 'Королівське зілля', icon: '🧴', image: 'assets/items/consumables/potion-royal.png', rarity: 'legendary', effect: { hp: 45 }, price: 62 },
  ],

  elixirs: [
    { templateId: 'elixir-strength', name: 'Еліксир сили', icon: '🔮', image: 'assets/items/consumables/elixir-strength.png', rarity: 'common', effect: { buff: { stat: 'strength', value: 2, fights: 3 } }, price: 28 },
    { templateId: 'elixir-agility', name: 'Еліксир спритності', icon: '💠', image: 'assets/items/consumables/elixir-agility.png', rarity: 'common', effect: { buff: { stat: 'agility', value: 2, fights: 3 } }, price: 28 },
    { templateId: 'elixir-vitality', name: 'Еліксир витривалості', icon: '🟣', image: 'assets/items/consumables/elixir-vitality.png', rarity: 'rare', effect: { buff: { stat: 'vitality', value: 3, fights: 3 } }, price: 40 },
    { templateId: 'elixir-great-strength', name: 'Великий еліксир сили', icon: '♦️', image: 'assets/items/consumables/elixir-great-strength.png', rarity: 'legendary', effect: { buff: { stat: 'strength', value: 4, fights: 3 } }, price: 68 },
  ],

  food: [
    { templateId: 'bread', name: 'Хліб', icon: '🍞', image: 'assets/items/consumables/bread.png', rarity: 'common', levelScaled: false, effect: { hunger: 18 }, price: 8 },
    { templateId: 'roasted-meat', name: 'Смажене м\'ясо', icon: '🍖', image: 'assets/items/consumables/roasted-meat.png', rarity: 'rare', levelScaled: false, effect: { hunger: 30 }, price: 20 },
    { templateId: 'goat-cheese', name: 'Козячий сир', icon: '🧀', image: 'assets/items/consumables/goat-cheese.png', rarity: 'rare', levelScaled: false, effect: { hunger: 24 }, price: 16 },
    { templateId: 'thick-stew', name: 'Густий рагу', icon: '🍲', image: 'assets/items/consumables/thick-stew.png', rarity: 'legendary', levelScaled: false, effect: { hunger: 42 }, price: 34 },
  ],

  water: [
    { templateId: 'water-flask', name: 'Фляга води', icon: '🥤', image: 'assets/items/consumables/water-flask.png', rarity: 'common', levelScaled: false, effect: { thirst: 24 }, price: 6 },
    { templateId: 'water-barrel', name: 'Барильце', icon: '🛢️', image: 'assets/items/consumables/water-barrel.png', rarity: 'rare', levelScaled: false, effect: { thirst: 32 }, price: 15 },
    { templateId: 'spring-jug', name: 'Глечик джерельної води', icon: '🫗', image: 'assets/items/consumables/spring-jug.png', rarity: 'rare', levelScaled: false, effect: { thirst: 27 }, price: 12 },
    { templateId: 'herbal-drink', name: 'Трав\'яний напій', icon: '🍵', image: 'assets/items/consumables/herbal-drink.png', rarity: 'legendary', levelScaled: false, effect: { thirst: 44 }, price: 28 },
  ],
};

/** Порядок и названия вкладок покупки. */
const SHOP_CATEGORIES = [
  { id: 'equipment', name: 'Спорядження', icon: '🗡️' },
  { id: 'potions',   name: 'Зілля',       icon: '🧪' },
  { id: 'elixirs',   name: 'Еліксири',    icon: '🔮' },
  { id: 'food',      name: 'Їжа',         icon: '🍖' },
  { id: 'water',     name: 'Вода',        icon: '🥤' },
];
