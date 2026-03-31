const { container, text, separator, v2, IS_V2 } = require('../utils/components');
const { getMarriage, updateMarriage } = require('../database');
const { getLoveLevelFromXp, loveXpInCurrentLevel, loveXpForCurrentLevel, loveXpToNextLevel, MAX_LOVE_LEVEL } = require('../utils/love_xp');
const { num } = require('../utils/xp');
const { formatDuration } = require('../utils/duration');

const LOVE_ROLES = {
  1: '1488588731874148422', 2: '1488588784965648655', 3: '1488588845262962799',
  4: '1488588894055436412', 5: '1488588948937900283', 6: '1488588997683974225',
  7: '1488589051081789450',
};
const LOVE_COOLDOWN = 30 * 60 * 1000;

async function applyLoveRoles(guild, userId, level) {
  const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
  if (!member) return;
  for (const [lvl, rId] of Object.entries(LOVE_ROLES)) {
    if (parseInt(lvl) !== level) await member.roles.remove(rId).catch(() => {});
  }
  const roleId = LOVE_ROLES[level];
  if (roleId) await member.roles.add(roleId).catch(() => {});
}

async function execute(client, message, args) {
  const marriage = getMarriage(message.guild.id, message.author.id);
  if (!marriage) {
    const r = await message.reply({ ...v2([container([text('❌ Вы не состоите в браке. Сначала найдите вторую половинку.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const now = Date.now();
  const lastLove = Number(marriage.last_love_at) || 0;

  if (now - lastLove < LOVE_COOLDOWN) {
    const remaining = LOVE_COOLDOWN - (now - lastLove);
    const r = await message.reply({ ...v2([container([text(`⏳ Подождите ещё **${formatDuration(remaining)}** перед следующим использованием.`)])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const todayISO = new Date().toISOString().split('T')[0];
  const yesterdayISO = new Date(now - 86_400_000).toISOString().split('T')[0];
  const lastDay = marriage.love_streak_day || '';
  const streakCount = Number(marriage.love_streak_count) || 0;

  let newStreak = 1;
  let penaltyXp = 0;

  if (lastDay === yesterdayISO) {
    newStreak = streakCount + 1;
  } else if (lastDay && lastDay < yesterdayISO) {
    const hoursSince = (now - lastLove) / 3_600_000;
    if (hoursSince > 48 && lastLove > 0) {
      penaltyXp = Math.floor((Number(marriage.love_xp) || 0) * 0.05);
    }
    newStreak = 1;
  }

  let currentXp = Math.max(0, (Number(marriage.love_xp) || 0) - penaltyXp);

  let xpGain = 20;
  if (newStreak >= 3) xpGain = 30;
  else if (newStreak >= 2) xpGain = 25;

  const isDouble = Math.random() < 0.10;
  if (isDouble) xpGain *= 2;

  const beforeLevel = getLoveLevelFromXp(currentXp);
  const newXp = currentXp + xpGain;
  const afterLevel = getLoveLevelFromXp(newXp);

  updateMarriage(marriage.id, {
    love_xp: newXp,
    love_streak_count: newStreak,
    last_love_at: now,
    love_streak_day: todayISO,
  });

  const inLevel = loveXpInCurrentLevel(newXp);
  const needed = loveXpForCurrentLevel(newXp);
  const toNext = loveXpToNextLevel(newXp);
  const isMax = afterLevel >= MAX_LOVE_LEVEL;

  const partnerId = marriage.user1_id === message.author.id ? marriage.user2_id : marriage.user1_id;

  const lines = [];
  if (penaltyXp > 0) lines.push(`⚠️ *Штраф за неактивность: -${penaltyXp} XP*`);
  lines.push(`<a:grownwh:1481735043150778480> +**${xpGain}** XP любви${isDouble ? ' 💥 **×2 БОНУС!**' : ''}`);
  lines.push(`<a:grownwh:1481735043150778480> **Стрик :** ${newStreak} ${newStreak >= 3 ? 'дн. (макс)' : newStreak >= 2 ? 'дн.' : 'день'}`);
  if (isMax) {
    lines.push(`<a:grownwh:1481735043150778480> **${afterLevel}** ур. *(максимальный уровень)*`);
  } else {
    lines.push(`<a:grownwh:1481735043150778480> **${afterLevel}** ур. **${num(inLevel)}** из **${num(needed ?? 0)}** exp.`);
    lines.push(`<a:grownwh:1481735043150778480> **${num(toNext)}** exp. осталось до нового уровня`);
  }

  await message.channel.send({
    flags: IS_V2,
    components: [
      container([
        text(`### 💕 <@${message.author.id}> и <@${partnerId}>`),
        separator(),
        text(lines.join('\n')),
      ]),
    ],
  });

  if (afterLevel > beforeLevel) {
    await applyLoveRoles(message.guild, message.author.id, afterLevel);
    await applyLoveRoles(message.guild, partnerId, afterLevel);
  }
}

module.exports = { execute };
