const { container, text, separator, actionRow, button, customEmoji, IS_V2 } = require('../utils/components');
const { db } = require('../database');
const { getLoveLevelFromXp, loveXpInCurrentLevel, loveXpForCurrentLevel, loveXpToNextLevel, MAX_LOVE_LEVEL } = require('../utils/love_xp');
const { num } = require('../utils/xp');
const { formatSeconds } = require('../utils/duration');

const PAGE_SIZE = 5;

async function buildLoveLbPage(guild, page) {
  const allMarriages = db.prepare('SELECT * FROM marriages WHERE guild_id = ? ORDER BY love_xp DESC').all(guild.id);

  const filtered = [];
  for (const m of allMarriages) {
    const u1 = guild.members.cache.get(m.user1_id);
    const u2 = guild.members.cache.get(m.user2_id);
    if (u1 && u2) filtered.push({ m, u1, u2 });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const items = [];
  for (let i = 0; i < slice.length; i++) {
    const { m, u1, u2 } = slice[i];
    const globalIndex = safePage * PAGE_SIZE + i;
    const xp = Number(m.love_xp) || 0;
    const level = getLoveLevelFromXp(xp);
    const inLevel = loveXpInCurrentLevel(xp);
    const needed = loveXpForCurrentLevel(xp);
    const toNext = loveXpToNextLevel(xp);
    const isMax = level >= MAX_LOVE_LEVEL;
    const voiceTogether = Number(m.voice_together) || 0;

    const levelStr = isMax
      ? `**${level}** ур. *(макс)* **${num(xp)}** exp.`
      : `**${level}** ур. **${num(inLevel)}** из **${num(needed ?? 0)}** exp.`;

    items.push(text(
      `*{#${globalIndex + 1}}* — \`${u1.displayName}\` + \`${u2.displayName}\`\n` +
      `<a:grownwh:1481735043150778480> ${levelStr}\n` +
      `<a:grownwh:1481735043150778480> **${num(isMax ? 0 : toNext)}** exp. до следующего уровня отношений\n` +
      `<a:grownwh:1481735043150778480> **${formatSeconds(voiceTogether)}** проведённого времени вместе`
    ));
    if (i < slice.length - 1) items.push(separator());
  }

  if (!items.length) items.push(text('*Нет пар*'));
  return { items, totalPages, safePage };
}

function buildLoveLbComponents(callerId, items, safePage, totalPages) {
  const dis = (d) => { const np = safePage + d; return np < 0 || np >= totalPages; };
  return [
    container([
      text(`### Таблица лидеров отношений (Страница ${safePage + 1}/${totalPages})`),
      separator(),
      ...items,
      separator(),
      actionRow([
        button(`lovelb_dback_${callerId}_${safePage}`, { emoji: customEmoji('1485286050665599086', 'dback'), style: 2, disabled: dis(-3) }),
        button(`lovelb_back_${callerId}_${safePage}`, { emoji: customEmoji('1485285989999185958', 'back'), style: 2, disabled: dis(-1) }),
        button(`lovelb_next_${callerId}_${safePage}`, { emoji: customEmoji('1484292444756512948', 'nexttt'), style: 2, disabled: dis(1) }),
        button(`lovelb_dnext_${callerId}_${safePage}`, { emoji: customEmoji('1484292483331526816', 'dnexttt'), style: 2, disabled: dis(3) }),
      ]),
    ]),
  ];
}

async function execute(client, message, args) {
  await message.guild.members.fetch().catch(() => {});
  const { items, totalPages, safePage } = await buildLoveLbPage(message.guild, 0);
  const components = buildLoveLbComponents(message.author.id, items, safePage, totalPages);
  await message.channel.send({ flags: IS_V2, components });
}

module.exports = { execute, buildLoveLbPage, buildLoveLbComponents };
