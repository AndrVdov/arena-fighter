/** Правила заработка во время работы в шахте. */
class Mining {

  static incomePerTick(player) {
    const config = BALANCE.mining;
    return config.baseGoldPerTick
      + Math.floor(player.effectiveStrength / config.strengthPerBonusGold);
  }

  static workTick(player) {
    const income = Mining.incomePerTick(player);
    player.gold += income;
    return income;
  }
}
