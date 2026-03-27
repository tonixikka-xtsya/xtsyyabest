function xpForLevel(level) {
  return 5 * level * level + 50 * level + 100;
}

function totalXpToReach(level) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i);
  return total;
}

function getLevelFromXp(xp) {
  let level = 0;
  while (xp >= totalXpToReach(level + 1)) level++;
  return level;
}

function xpInCurrentLevel(xp) {
  const level = getLevelFromXp(xp);
  return xp - totalXpToReach(level);
}

function xpNeededForCurrentLevel(xp) {
  const level = getLevelFromXp(xp);
  return xpForLevel(level);
}

function num(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

module.exports = { xpForLevel, totalXpToReach, getLevelFromXp, xpInCurrentLevel, xpNeededForCurrentLevel, num };
