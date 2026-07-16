/**
 * HUD ИГРОКА
 * ----------
 * Компактная модульная панель в левом верхнем углу:
 * портрет героя, имя и уровень, HP, XP, золото и потребности.
 */
class Hud {

  static HERO_PORTRAIT = 'assets/player/hero.webp';

  /** Щит аватара: рисуется SVG, левая половина светлее (блик). */
  static SHIELD_SVG = `
    <svg viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2 L36 8 V23 C36 35 29 42.5 20 46 C11 42.5 4 35 4 23 V8 Z"
            fill="#3a7cc9" stroke="#c8ccd4" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M20 4.5 L6.5 9.6 V23 C6.5 33.6 12.3 40.2 20 43.5 Z" fill="#7cc3f5"/>
    </svg>
  `;

  /** Единый набор лёгких SVG-иконок для HUD и навигации. */
  static ICONS = {
    heart: '<path d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.5 9.2h3.8a1.9 1.9 0 0 1 0 3.8H10.7a1.9 1.9 0 0 0 0 3.8h3.8"/>',
    xp: '<path d="m6 7 4 5-4 5M18 7l-4 5 4 5"/><path d="M10 7h4M10 17h4"/>',
    hunger: '<path d="M7 3v7M4.5 3v5A2.5 2.5 0 0 0 7 10.5V21M15 3v18M15 3c4 2.2 4 8 0 10"/>',
    thirst: '<path d="M12 2.8S6.5 9.3 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.3 12 2.8 12 2.8Z"/>',
    sleep: '<path d="M18.8 15.5A8 8 0 0 1 8.5 5.2 8 8 0 1 0 18.8 15.5Z"/>',
    volume: '<path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    volumeOff: '<path d="M4 10h4l5-4v12l-5-4H4zM16 9l5 6M21 9l-5 6"/>',
    wounded: '<path d="M5 19 19 5M7 5l12 12M4 15l5 5M15 4l5 5"/>',
    nearDeath: '<path d="M5 10a7 7 0 1 1 14 0v5l-2 2H7l-2-2v-5Z"/><path d="M9 11h.01M15 11h.01M10 17v3M14 17v3"/>',
    stats: '<path d="M6 3.5h12v17H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    inventory: '<path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2M8 12h8"/>',
    shield: '<path d="M12 2.5 20 5.5v6.2c0 5.2-3.2 8.4-8 10-4.8-1.6-8-4.8-8-10V5.5l8-3Z"/><path d="M12 5v13.5M7 8.2h10"/>',
    chest: '<path d="M3 9h18v11H3z"/><path d="M4 9V6h16v3M3 13h18M10 12h4v4h-4z"/>',
    equipment: '<path d="m5 4 15 15M19 4 4 19M3 3l5 1-4 4-1-5ZM21 3l-5 1 4 4 1-5ZM3.5 20.5l3-3M20.5 20.5l-3-3"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z"/><path d="M9 3v16M15 5v16"/>',
    room: '<path d="M4 21V5l8-2 8 2v16M4 21h16M12 3v18"/><path d="M8 8h.01M16 8h.01M8 13h.01M16 13h.01"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7"/>',
    shop: '<path d="M4 10v11h16V10M3 10l2-6h14l2 6"/><path d="M3 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0M9 21v-6h6v6"/>',
    refresh: '<path d="M20 7v5h-5"/><path d="M18.2 16.6A8 8 0 1 1 19.5 8L20 12"/>',
    menu: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    rest: '<path d="M12 21c4-2.2 5.5-5 3.4-8.2-.2 2-1.3 2.8-2.2 3.3.4-3.7-1.2-6.5-4.4-9.1.5 3-2.9 5.1-2.9 8.5C5.9 18.6 8.5 21 12 21Z"/>',
    mine: '<path d="M14 4c-3.7 0-6.5 1.2-8.5 3.5l3 3C10.2 7.8 12 6 14 4Z"/><path d="m10 9 10 10M17.5 16.5l-2 2M6 20l7-7"/>',
    bed: '<path d="M3 18V8M21 18v-7H8a3 3 0 0 0-3 3v1h16M3 18v3M21 18v3M5 11h3"/>',
    potion: '<path d="M9 3h6M10 3v4l-4.5 8.2A4 4 0 0 0 9 21h6a4 4 0 0 0 3.5-5.8L14 7V3M7.2 14h9.6"/>',
    elixir: '<path d="M9 3h6M10 3v5l-4 7a4 4 0 0 0 3.5 6h5a4 4 0 0 0 3.5-6l-4-7V3M8 14h8"/>',
    race: '<circle cx="12" cy="8" r="4"/><path d="M5 21c.8-5 3.1-7.5 7-7.5S18.2 16 19 21M4 5l3 1M20 5l-3 1"/>',
    rookie: '<path d="m5 19 12-12M14 4l6 6-4 1-3-3 1-4ZM4 20l3-1-2-2-1 3Z"/><path d="M5 5l14 14M4 4l4 1-3 3-1-4ZM16 16l4 4"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  };

  static icon(name, className = '') {
    const body = Hud.ICONS[name] ?? Hud.ICONS.star;
    return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  }

  constructor(rootElement, player) {
    this.root = rootElement;
    this.player = player;
  }

  /** Полная перерисовка HUD. Вызывается при любом изменении игрока. */
  render() {
    const p = this.player;

    this.root.innerHTML = `
      <div class="hud__portrait-block">
        <div class="hud__avatar">
          <img src="${p.portrait}" alt="Портрет героя ${p.name}">
        </div>
        <span class="hud__level-medallion" title="Рівень героя">${p.level}</span>
        ${p.freeStatPoints > 0 ? `
          <div class="hud__points" title="Вільні очки характеристик">
            ${Hud.icon('star')}<span>${p.freeStatPoints}</span>
          </div>
        ` : ''}
      </div>

      <div class="hud__info">
        <div class="hud__topline">
          <div class="hud__identity">
            <span class="hud__name">${p.name}</span>
            <span class="hud__level">рівень ${p.level}</span>
          </div>
          <div class="hud__gold" title="Золото">
            ${Hud.icon('coin')}
            <span>${p.gold}</span>
          </div>
        </div>

        <div class="hud__resource hud__resource--hp${p.hp / p.maxHp <= 0.2 ? ' hud__resource--critical' : ''}">
          <span class="hud__resource-icon">${Hud.icon('heart')}</span>
          ${this.bar('hp', p.hp, p.maxHp, `${p.hp} / ${p.maxHp}`)}
        </div>

        <div class="hud__resource hud__resource--xp">
          <span class="hud__resource-icon hud__resource-icon--xp">${Hud.icon('xp')}</span>
          ${this.bar('xp', p.xp, p.xpToNextLevel, `${p.xp} / ${p.xpToNextLevel}`)}
        </div>

        <div class="hud__needs">
          ${this.needBar('hunger', p.needs.hunger)}
          ${this.needBar('thirst', p.needs.thirst)}
          ${this.needBar('sleep', p.needs.sleep)}
        </div>

      </div>
    `;
  }

  /** Шкала с заливкой по проценту и необязательной подписью. */
  bar(kind, value, max, label = '') {
    const percent = Math.max(0, Math.min(100, (value / max) * 100));

    return `
      <div class="bar bar--${kind}" role="meter" aria-label="${label || kind}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}">
        <div class="bar__fill bar__fill--${kind}" style="width: ${percent}%"></div>
        ${label ? `<span class="bar__label">${label}</span>` : ''}
      </div>
    `;
  }

  /** Компактная шкала потребности; тултип объясняет, на что она влияет. */
  needBar(need, value) {
    const label = Needs.LABELS[need];
    const cfg = BALANCE.needs;
    const percent = Math.round(cfg.bonusPercent * 100);
    const hint = Needs.isFixed(this.player)
      ? `${label.name}: незмінно ${value}. Нежить не має цієї потреби.`
      : `${label.name}: ${value} / ${cfg.max}. ` +
        `Від ${cfg.buffAbove}: +${percent}% до ${label.statName}, ` +
        `до ${cfg.debuffBelow}: −${percent}%`;
    const state = value <= cfg.debuffBelow ? 'low' : value >= cfg.buffAbove ? 'high' : 'normal';

    return `
      <div class="hud__need hud__need--${state}" title="${hint}">
        <span class="hud__need-icon">${Hud.icon(need)}</span>
        <div class="hud__need-data">
          <span class="hud__need-value">${value}</span>
          ${this.bar(need, value, BALANCE.needs.max)}
        </div>
      </div>
    `;
  }
}
