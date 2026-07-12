/**
 * ПРЕДМЕТ
 * -------
 * Уровень определяет масштаб характеристик, редкость — качество предмета
 * относительно других вещей того же уровня. Экземпляр хранит уже рассчитанные
 * бонусы/эффекты, поэтому баланс сохранений не меняется задним числом.
 */
class Item {

  constructor({
    id, templateId = null, name, icon = '✦', image = null, level = 1,
    slot = null, rarity = 'common', bonuses = {}, effect = null, price = null,
    levelScaled = true,
  }) {
    this.id = id ?? Item.generateId();
    this.templateId = templateId;
    this.name = name;
    this.icon = icon;           // запасной символ для старых сохранений
    this.image = image ?? Item.equipmentImage(slot, rarity);
    this.levelScaled = levelScaled !== false;
    this.level = this.levelScaled ? Item.normalizeLevel(level) : 1;
    this.slot = slot;
    this.rarity = RARITIES[rarity] ? rarity : 'common';
    this.bonuses = bonuses;
    this.effect = effect;
    this.price = price;
  }

  static generateId() {
    return `item-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  static normalizeLevel(level) {
    return Math.max(1, Math.floor(Number(level) || 1));
  }

  static levelMultiplier(level, growth) {
    return 1 + (Item.normalizeLevel(level) - 1) * growth;
  }

  static scaleValue(value, level, growth) {
    return Math.max(1, Math.round(value * Item.levelMultiplier(level, growth)));
  }

  static equipmentImage(slot, rarity) {
    return EQUIPMENT_SLOTS[slot]?.images?.[rarity] ?? null;
  }

  static priceForLevel(basePrice, level) {
    return Math.max(1, Math.round(basePrice * Item.levelMultiplier(level, BALANCE.items.pricePerLevel)));
  }

  /** Создать расходник из шаблона, масштабировав эффект и цену. */
  static fromTemplate(template, level = 1) {
    const levelScaled = template.levelScaled !== false;
    const itemLevel = levelScaled ? Item.normalizeLevel(level) : 1;
    const rarity = template.rarity ?? 'common';
    const rarityMultiplier = RARITIES[rarity].powerMultiplier;
    const effect = Item.scaleEffect(template.effect, itemLevel, rarityMultiplier);

    return new Item({
      ...template,
      level: itemLevel,
      levelScaled,
      effect,
      price: levelScaled
        ? Item.priceForLevel(template.price ?? 6, itemLevel)
        : template.price ?? 6,
    });
  }

  static scaleEffect(effect, level, rarityMultiplier) {
    const scaled = {};
    const consumableGrowth = BALANCE.items.consumablePerLevel;

    for (const key of ['hp', 'hunger', 'thirst', 'sleep']) {
      if (effect?.[key]) {
        scaled[key] = Item.scaleValue(effect[key] * rarityMultiplier, level, consumableGrowth);
      }
    }

    if (effect?.buff) {
      scaled.buff = {
        ...effect.buff,
        value: Item.scaleValue(
          effect.buff.value * rarityMultiplier,
          level,
          BALANCE.items.buffPerLevel
        ),
      };
    }
    return scaled;
  }

  get isEquipment() {
    return this.slot !== null;
  }

  get isConsumable() {
    return this.effect !== null;
  }

  /** Категория для магазина и домашнего сундука. */
  get storageCategory() {
    if (this.isEquipment) return 'equipment';
    if (this.effect?.hp) return 'potions';
    if (this.effect?.buff) return 'elixirs';
    if (this.effect?.hunger || this.effect?.sleep) return 'food';
    if (this.effect?.thirst) return 'water';
    return 'other';
  }

  get rarityInfo() {
    return RARITIES[this.rarity];
  }

  /** Простая оценка суммарной силы экипировки для автоматического выбора. */
  get powerScore() {
    if (!this.isEquipment) return 0;
    return Object.values(this.bonuses)
      .reduce((total, value) => total + Math.max(0, Number(value) || 0), 0);
  }

  canUseAtLevel(playerLevel) {
    return !this.levelScaled || Item.normalizeLevel(playerLevel) >= this.level;
  }

  /** Цена продажи зависит от реальной стоимости, уровня и редкости. */
  get sellPrice() {
    const fallbackValue = Item.priceForLevel(this.rarityInfo.baseValue, this.level);
    const value = this.price ?? fallbackValue;
    const ratio = this.isEquipment
      ? BALANCE.items.equipmentSellRatio
      : BALANCE.items.consumableSellRatio;
    return Math.max(2, Math.round(value * ratio));
  }

  describe() {
    if (this.isEquipment) {
      return Object.entries(this.bonuses)
        .map(([aspect, value]) => ASPECTS[aspect].format(value))
        .join(', ');
    }

    const parts = [];
    const e = this.effect;
    if (e.hp)     parts.push(`відновлює ${e.hp} HP`);
    if (e.hunger) parts.push(`+${e.hunger} до голоду`);
    if (e.thirst) parts.push(`+${e.thirst} до спраги`);
    if (e.sleep)  parts.push(`+${e.sleep} до сну`);
    if (e.buff)   parts.push(`+${e.buff.value} ${ASPECTS[e.buff.stat].name} на ${e.buff.fights} боїв`);
    return parts.join(', ');
  }

  toJSON() {
    return {
      id: this.id,
      templateId: this.templateId,
      name: this.name,
      icon: this.icon,
      image: this.image,
      level: this.level,
      levelScaled: this.levelScaled,
      slot: this.slot,
      rarity: this.rarity,
      bonuses: this.bonuses,
      effect: this.effect,
      price: this.price,
    };
  }

  /** Старые предметы получают уровень героя, но сохраняют прежние числа. */
  static fromJSON(data, fallbackLevel = 1) {
    if (!data) return null;
    const potionTemplate = Item.canonicalPotionTemplate(data);
    if (potionTemplate) {
      const migrated = Item.fromTemplate(potionTemplate, data.level ?? fallbackLevel);
      migrated.id = data.id ?? migrated.id;
      return migrated;
    }

    const template = Item.findConsumableTemplate(data.templateId, data.name);
    if (template?.levelScaled === false) {
      const migrated = Item.fromTemplate(template, 1);
      migrated.id = data.id ?? migrated.id;
      return migrated;
    }

    const rarity = data.rarity ?? template?.rarity ?? 'common';

    return new Item({
      ...data,
      templateId: data.templateId ?? template?.templateId ?? null,
      image: data.image ?? template?.image ?? Item.equipmentImage(data.slot, rarity),
      levelScaled: data.levelScaled ?? template?.levelScaled ?? true,
      rarity,
      level: data.level ?? fallbackLevel,
    });
  }

  /** Все старые лечебные зелья сводятся к одному шаблону своей редкости. */
  static canonicalPotionTemplate(data) {
    const isPotion = data.templateId?.startsWith('potion-')
      || ['Мале зілля лікування', 'Велике зілля лікування',
        'Зілля польового лікаря', 'Королівське зілля'].includes(data.name);
    if (!isPotion) return null;

    const rarity = RARITIES[data.rarity] ? data.rarity : 'common';
    return SHOP_CONSUMABLES.potions.find(template => template.rarity === rarity)
      ?? SHOP_CONSUMABLES.potions[0];
  }

  static findConsumableTemplate(templateId, name) {
    const templates = [
      ...Object.values(SHOP_CONSUMABLES).flat(),
      ...FOOD_DROPS,
    ];
    return templates.find(template => template.name === name)
      ?? templates.find(template => templateId && template.templateId === templateId)
      ?? null;
  }
}
