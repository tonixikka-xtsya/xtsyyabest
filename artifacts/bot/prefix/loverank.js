const { container, text, separator, IS_V2 } = require('../utils/components');
const { getMarriage, getChildren } = require('../database');
const { getLoveLevelFromXp, loveXpInCurrentLevel, loveXpForCurrentLevel, loveXpToNextLevel, MAX_LOVE_LEVEL } = require('../utils/love_xp');
const { num } = require('../utils/xp');
const { formatMs, formatSeconds } = require('../utils/duration');

async function execute(client, message, args) {
  const marriage = getMarriage(message.guild.id, message.author.id);
  if (!marriage) {
    const { v2 } = require('../utils/components');
    const r = await message.reply({ ...v2([container([text('❌ Вы не состоите в браке.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const partnerId = marriage.user1_id === message.author.id ? marriage.user2_id : marriage.user1_id;
  const xp = Number(marriage.love_xp) || 0;
  const level = getLoveLevelFromXp(xp);
  const inLevel = loveXpInCurrentLevel(xp);
  const neededInLevel = loveXpForCurrentLevel(xp);
  const toNext = loveXpToNextLevel(xp);
  const isMax = level >= MAX_LOVE_LEVEL;
  const duration = Date.now() - Number(marriage.married_at);
  const voiceTogether = Number(marriage.voice_together) || 0;

  const children = getChildren(marriage.id);
  let childrenText = '—';
  if (children.length) {
    const names = [];
    for (const c of children) {
      const m = message.guild.members.cache.get(c.child_id) || await message.guild.members.fetch(c.child_id).catch(() => null);
      names.push(m ? m.displayName : c.child_id);
    }
    childrenText = names.join(', ');
  }

  const levelLine = isMax
    ? `<a:grownwh:1481735043150778480> **Уровень :** **${level}** ур. *(максимальный уровень)*`
    : `<a:grownwh:1481735043150778480> **Уровень :** **${level}** ур. **${num(inLevel)}** из **${num(neededInLevel ?? 0)}** exp.`;

  const toNextLine = isMax
    ? null
    : `<a:grownwh:1481735043150778480> **${num(toNext)}** exp. осталось до нового уровня`;

  const lines = [
    `<a:grownwh:1481735043150778480> **Пара :** <@${marriage.user1_id}> и <@${marriage.user2_id}>`,
    `<a:grownwh:1481735043150778480> **Дети :** ${childrenText}`,
  ];
  const lines2 = [
    `<a:grownwh:1481735043150778480> **Длительность отношений :** ${formatMs(duration)}`,
    levelLine,
    ...(toNextLine ? [toNextLine] : []),
  ];

  await message.channel.send({
    flags: IS_V2,
    components: [
      container([
        text('### Уровень отношений'),
        text(lines.join('\n')),
        separator(),
        text(lines2.join('\n')),
      ]),
    ],
  });
}

module.exports = { execute };
