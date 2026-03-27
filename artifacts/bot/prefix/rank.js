const { container, text, separator, IS_V2 } = require('../utils/components');
const { getOrCreateUser, getVoiceForDate, getVoiceSince } = require('../database');
const { getLevelFromXp, xpInCurrentLevel, xpNeededForCurrentLevel, num } = require('../utils/xp');
const { formatSeconds } = require('../utils/duration');

const BONUS_ROLE_HALF = '1458850005153742993';
const BONUS_ROLE_FULL_A = '1467228617334587536';
const BONUS_ROLE_FULL_B = '1467063042431778869';

async function execute(client, message, args) {
  const targetUser = message.mentions.members.first() || message.member;
  const userData = getOrCreateUser(targetUser.id, message.guild.id);

  const level = getLevelFromXp(userData.xp);
  const currentLevelXp = xpInCurrentLevel(userData.xp);
  const neededXp = xpNeededForCurrentLevel(userData.xp);
  const remaining = neededXp - currentLevelXp;

  let bonus = 0.0;
  if (targetUser.roles.cache.has(BONUS_ROLE_FULL_A) || targetUser.roles.cache.has(BONUS_ROLE_FULL_B)) {
    bonus = 1.5;
  } else if (targetUser.roles.cache.has(BONUS_ROLE_HALF)) {
    bonus = 0.5;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
  const sixDaysAgoStr = sixDaysAgo.toISOString().split('T')[0];

  const voiceToday = getVoiceForDate(targetUser.id, message.guild.id, todayStr);
  const voiceWeek = getVoiceSince(targetUser.id, message.guild.id, sixDaysAgoStr);
  const voiceTotal = userData.voice_total || 0;

  const todayTs = Math.floor(now.setHours(0, 0, 0, 0) / 1000);
  const sixDaysTs = Math.floor(sixDaysAgo.setHours(0, 0, 0, 0) / 1000);

  const components = [
    container([
      text(
        `## ${targetUser.displayName} — Профиль\n` +
        `<a:grownwh:1481735043150778480> **ID :** \`${targetUser.id}\`\n` +
        `<a:grownwh:1481735043150778480> **REP :** \`${userData.rep_received}\``
      ),
      separator(),
      text(
        `## Уровень\n` +
        `<a:grownwh:1481735043150778480> **${level}** ур. **${num(currentLevelXp)}** из **${num(neededXp)}** exp.\n` +
        `<a:grownwh:1481735043150778480> **${num(remaining)}** exp. осталось до нового уровня\n` +
        `<a:grownwh:1481735043150778480> **Бонусный опыт:** +${bonus.toFixed(1)}`
      ),
      separator(),
      text(
        `## Голосовая активность\n` +
        `<a:grownwh:1481735043150778480> **От <t:${todayTs}:d> :** ${formatSeconds(voiceToday)}\n` +
        `<a:grownwh:1481735043150778480> **От <t:${sixDaysTs}:d> :** ${formatSeconds(voiceWeek)}\n` +
        `<a:grownwh:1481735043150778480> **Всё время :** ${formatSeconds(voiceTotal)}`
      ),
    ]),
  ];

  await message.channel.send({ flags: IS_V2, components });
}

module.exports = { execute };
