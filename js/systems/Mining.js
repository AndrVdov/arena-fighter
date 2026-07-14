/** Правила заработка во время работы в шахте. */
class Mining {

  static canWork(player) {
    return player.healthCondition === null && player.needs.sleep > 0;
  }

  static incomePerTick(player) {
    const config = BALANCE.mining;
    return config.baseGoldPerTick
      + Math.floor(player.effectiveStrength / config.strengthPerBonusGold);
  }

  static workTick(player, random = Math.random) {
    if (!Mining.canWork(player)) {
      return { earnedGold: 0, sleepSpent: 0, foundGold: false, worked: false };
    }

    const sleepSpent = Math.min(player.needs.sleep, BALANCE.mining.sleepCostPerTick);

    const potentialIncome = Mining.incomePerTick(player);
    player.needs.sleep -= sleepSpent;
    const foundGold = random() < BALANCE.mining.goldChancePerTick;
    const earnedGold = foundGold ? potentialIncome : 0;
    player.gold += earnedGold;

    return { earnedGold, sleepSpent, foundGold, worked: true };
  }
}
