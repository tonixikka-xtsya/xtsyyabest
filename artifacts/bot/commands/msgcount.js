const { container, text, separator, actionRow, button, customEmoji, IS_V2 } = require('../utils/components');
const { getMessageLeaderboard } = require('../database');
const { num } = require('../utils/xp');

const PAGE_SIZE = 5;
const data = { name: 'msgcount', description: 'Таблица лидеров по количеству сообщений' };

function placeStr(i) {
  if (i === 0) return '`#1`';
  if (i === 1) return '`#2`';
  if (i === 2) return '`#3`';
  return `\`#${i + 1}\``;
}

async function buildMsgPage(guild, page) {
  const all = getMessageLeaderboard(guild.id);
  const filtered = [];
  for (const row of all) {
    const member = guild.members.cache.get(row.user_id);
    if (member) filtered.push({ row, member });
  }
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const items = [];
  for (let i = 0; i < slice.length; i++) {
    const { row, member } = slice[i];
    const globalIndex = safePage * PAGE_SIZE + i;
    items.push(text(
      `*{#${globalIndex + 1}}* **— ${member.displayName}**\n` +
      `<a:grownwh:1481735043150778480> **${num(Number(row.count))}** *сообщений*`
    ));
    items.push(separator());
  }

  if (!items.length) items.push(text('*Нет данных*'));
  return { items, totalPages, safePage };
}

function buildMsgComponents(callerId, items, safePage, totalPages) {
  const dis = (d) => { const np = safePage + d; return np < 0 || np >= totalPages; };
  return [
    container([
      text(`### Количество сообщений (Страница ${safePage + 1}/${totalPages})`),
      separator(),
      ...items,
      actionRow([
        button(`mc_dback_${callerId}_${safePage}`, { emoji: customEmoji('1485286050665599086', 'dback'), style: 2, disabled: dis(-3) }),
        button(`mc_back_${callerId}_${safePage}`, { emoji: customEmoji('1485285989999185958', 'back'), style: 2, disabled: dis(-1) }),
        button(`mc_next_${callerId}_${safePage}`, { emoji: customEmoji('1484292444756512948', 'nexttt'), style: 2, disabled: dis(1) }),
        button(`mc_dnext_${callerId}_${safePage}`, { emoji: customEmoji('1484292483331526816', 'dnexttt'), style: 2, disabled: dis(3) }),
      ]),
    ]),
  ];
}

async function execute(client, interaction) {
  await interaction.guild.members.fetch().catch(() => {});
  const { items, totalPages, safePage } = await buildMsgPage(interaction.guild, 0);
  const components = buildMsgComponents(interaction.user.id, items, safePage, totalPages);
  await interaction.reply({ flags: IS_V2, components });
}

module.exports = { data, execute, buildMsgPage, buildMsgComponents };
