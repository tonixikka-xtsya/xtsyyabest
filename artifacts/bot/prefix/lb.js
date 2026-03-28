const { container, text, separator, actionRow, button, customEmoji, IS_V2 } = require('../utils/components');
const { db } = require('../database');
const { getLevelFromXp, xpInCurrentLevel, xpNeededForCurrentLevel, num } = require('../utils/xp');
const { formatSeconds } = require('../utils/duration');

const PAGE_SIZE = 5;

const PLACE_EMOJIS = [
  '<a:place_1:1486469598537584891>',
  '<a:place_2:1486469625091985508>',
  '<a:place_3:1486469652891697202>',
];

function placeStr(index) {
  if (index < 3) return `{#${PLACE_EMOJIS[index]}}`;
  return `{#${index + 1}}`;
}

async function buildLbPage(guild, page) {
  const allUsers = db.prepare('SELECT * FROM users WHERE guild_id = ? ORDER BY xp DESC').all(guild.id);

  const filtered = [];
  for (const u of allUsers) {
    const member = guild.members.cache.get(u.user_id);
    if (member) filtered.push({ user: u, member });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const items = [];
  for (let i = 0; i < slice.length; i++) {
    const { user, member } = slice[i];
    const globalIndex = safePage * PAGE_SIZE + i;
    const level = getLevelFromXp(Number(user.xp));
    const curXp = xpInCurrentLevel(Number(user.xp));
    const neededXp = xpNeededForCurrentLevel(Number(user.xp));
    const remaining = neededXp - curXp;
    const voiceTotal = Number(user.voice_total) || 0;

    items.push(text(
      `### ${placeStr(globalIndex)} — ${member.displayName}\n` +
      `<a:grownwh:1481735043150778480> **${level}** ур. **${num(curXp)}** из **${num(neededXp)}** exp.\n` +
      `<a:grownwh:1481735043150778480> **${num(remaining)}** exp. осталось до нового уровня\n` +
      `<a:grownwh:1481735043150778480> **${formatSeconds(voiceTotal)}** хлюпанья губами`
    ));
    if (i < slice.length - 1) items.push(separator());
  }

  if (!items.length) {
    items.push(text('*Нет участников*'));
  }

  return { items, totalPages, safePage };
}

function navButtons(callerId, page, totalPages) {
  const disabled = (delta) => {
    const np = page + delta;
    return np < 0 || np >= totalPages;
  };
  return actionRow([
    button(`lb_dback_${callerId}_${page}`, { emoji: customEmoji('1485286050665599086', 'dback'), style: 2, disabled: disabled(-3) }),
    button(`lb_back_${callerId}_${page}`, { emoji: customEmoji('1485285989999185958', 'back'), style: 2, disabled: disabled(-1) }),
    button(`lb_next_${callerId}_${page}`, { emoji: customEmoji('1484292444756512948', 'nexttt'), style: 2, disabled: disabled(1) }),
    button(`lb_dnext_${callerId}_${page}`, { emoji: customEmoji('1484292483331526816', 'dnexttt'), style: 2, disabled: disabled(3) }),
  ]);
}

function buildComponents(callerId, items, safePage, totalPages) {
  return [
    container([
      text(`### Топ рейтинга участников (Страница ${safePage + 1}/${totalPages})`),
      separator(),
      ...items,
      separator(),
      navButtons(callerId, safePage, totalPages),
    ]),
  ];
}

async function execute(client, message, args) {
  await message.guild.members.fetch().catch(() => {});

  const { items, totalPages, safePage } = await buildLbPage(message.guild, 0);
  const components = buildComponents(message.author.id, items, safePage, totalPages);

  await message.channel.send({ flags: IS_V2, components });
}

module.exports = { execute, buildLbPage, navButtons, buildComponents };
