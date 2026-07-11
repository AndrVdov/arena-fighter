/**
 * ИГРОВЫЕ ЛОКАЦИИ
 * ----------------
 * Данные физических мест мира. Глобальная карта отображает эти данные,
 * но сама локацией не является.
 */
const LOCATIONS = {

  home: {
    id: 'home',
    uiIcon: 'home',
    name: 'Дім',
    subtitle: 'Відпочивай, відновлюйся та зберігай спорядження',
    mapHint: 'Скриня, відпочинок біля вогнища та сон',
    mapMarker: {
      image: 'assets/map/locations/home.png',
      x: 25,
      y: 63,
      size: 14,
    },
  },

  arena: {
    id: 'arena',
    uiIcon: 'equipment',
    name: 'Арена',
    subtitle: 'Бийся та здобувай славу',
    mapHint: 'Обирай супротивника та перемагай у бою',
    mapMarker: {
      image: 'assets/map/locations/arena.png',
      x: 76,
      y: 29,
      size: 17,
    },
  },

  shop: {
    id: 'shop',
    uiIcon: 'shop',
    name: 'Крамниця',
    subtitle: 'Купівля та продаж',
    mapHint: 'Спорядження, зілля, їжа та вода',
    mapMarker: {
      image: 'assets/map/locations/shop.png',
      x: 69,
      y: 67,
      size: 15,
    },
  },
};
