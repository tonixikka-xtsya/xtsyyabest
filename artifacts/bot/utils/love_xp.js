// Cumulative XP thresholds for each love level (index = level - 1)
const LOVE_THRESHOLDS = [0, 120, 300, 600, 1000, 1600, 2400];
const MAX_LOVE_LEVEL = 7;

function getLoveLevelFromXp(xp) {
  for (let i = LOVE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LOVE_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

function loveXpInCurrentLevel(xp) {
  const level = getLoveLevelFromXp(xp);
  return xp - LOVE_THRESHOLDS[level - 1];
}

// XP range within current level (i.e. how much needed to level up from here)
function loveXpForCurrentLevel(xp) {
  const level = getLoveLevelFromXp(xp);
  if (level >= MAX_LOVE_LEVEL) return null;
  return LOVE_THRESHOLDS[level] - LOVE_THRESHOLDS[level - 1];
}

function loveXpToNextLevel(xp) {
  const level = getLoveLevelFromXp(xp);
  if (level >= MAX_LOVE_LEVEL) return 0;
  return LOVE_THRESHOLDS[level] - xp;
}

module.exports = { getLoveLevelFromXp, loveXpInCurrentLevel, loveXpForCurrentLevel, loveXpToNextLevel, MAX_LOVE_LEVEL, LOVE_THRESHOLDS };
