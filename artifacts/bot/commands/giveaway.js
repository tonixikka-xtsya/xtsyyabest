const { container, text, separator, mediaGallery, actionRow, button, customEmoji, v2, IS_V2 } = require('../utils/components');
const { parseDuration } = require('../utils/duration');
const { db } = require('../database');

const GIVEAWAY_ROLES = ['1478848229733962002', '1407804721640640542', '1429169517119934685', '1404872037624709152'];

const data = {
  name: 'giveaway',
  description: 'Создать розыгрыш',
  options: [
    { type: 3, name: 'предмет', description: 'Что разыгрывается', required: true },
    { type: 3, name: 'условие', description: 'Условие участия', required: true },
    { type: 3, name: 'время', description: 'Длительность (например: 1h, 30m, 2d)', required: true },
    { type: 4, name: 'победители', description: 'Количество победителей', required: false, min_value: 1 },
    { type: 3, name: 'изображение', description: 'URL изображения (необязательно)', required: false },
  ],
};

function buildGiveawayComponents(gData, participantCount, ended = false, winners = []) {
  const endTs = Math.floor(gData.end_time / 1000);
  const winnerLabel = gData.winner_count > 1 ? 'Победители' : 'Победитель';
  const winnerText = ended && winners.length
    ? winners.map(w => `<@${w}>`).join(', ')
    : '—';

  const items = [
    text(`## Розыгрыш : ${gData.item}`),
  ];

  if (gData.image_url) {
    items.push(mediaGallery([gData.image_url]));
  }

  items.push(separator());
  items.push(text(
    `<a:grownwh:1481735043150778480> **Условие :**\n\`\`\`${gData.description}\`\`\`\n` +
    `<a:grownwh:1481735043150778480> **Организатор :** <@${gData.organizer_id}> (${gData.organizer_id})\n` +
    `<a:grownwh:1481735043150778480> **${winnerLabel} :** ${winnerText}\n` +
    `<a:grownwh:1481735043150778480> **Закончится :** <t:${endTs}:R>\n` +
    `<a:grownwh:1481735043150778480> **ID розыгрыша :** ${gData.id}`
  ));

  items.push(separator());
  items.push(actionRow([
    button(`giveaway_join_${gData.id}`, {
      emoji: customEmoji('1492370508195299369', 'pribavlsya1'),
      label: 'Участвовать',
      style: 1,
      disabled: ended,
    }),
    button(`giveaway_chance_${gData.id}`, {
      emoji: customEmoji('1492370511865577522', 'dice1'),
      label: 'Шанс выпадения',
      style: 2,
    }),
    button(`giveaway_members_${gData.id}`, {
      emoji: customEmoji('1492370510229798923', 'group1'),
      label: String(participantCount),
      style: 2,
    }),
  ]));

  return [container(items)];
}

async function execute(client, interaction) {
  const hasRole = GIVEAWAY_ROLES.some(id => interaction.member.roles.cache.has(id));
  if (!hasRole) {
    return interaction.reply({ ...v2([container([text('❌ У вас нет прав для создания розыгрышей.')])], true) });
  }

  const item = interaction.options.getString('предмет');
  const condition = interaction.options.getString('условие');
  const timeStr = interaction.options.getString('время');
  const winnerCount = interaction.options.getInteger('победители') ?? 1;
  const imageUrl = interaction.options.getString('изображение') ?? null;

  const duration = parseDuration(timeStr);
  if (!duration) {
    return interaction.reply({ ...v2([container([text('❌ Неверный формат времени. Пример: `1h`, `30m`, `2d`')])], true) });
  }

  const now = Date.now();
  const endTime = now + duration;
  const organizerName = interaction.member.displayName;

  const result = db.prepare(`
    INSERT INTO giveaways (guild_id, channel_id, item, description, organizer_id, organizer_name, winner_count, image_url, start_time, end_time, ended)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(interaction.guildId, interaction.channelId, item, condition, interaction.user.id, organizerName, winnerCount, imageUrl, now, endTime);

  const gId = Number(result.lastInsertRowid);
  const gData = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(gId);

  const components = buildGiveawayComponents(gData, 0);

  await interaction.reply({ flags: IS_V2, components });
  const msg = await interaction.fetchReply();

  db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?').run(msg.id, gId);

  scheduleGiveaway(client, gId, duration);
}

function scheduleGiveaway(client, gId, ms) {
  setTimeout(() => endGiveaway(client, gId), ms);
}

async function endGiveaway(client, gId) {
  const gData = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(gId);
  if (!gData || gData.ended) return;

  db.prepare('UPDATE giveaways SET ended = 1 WHERE id = ?').run(gId);

  const participants = db.prepare('SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?').all(gId);
  const count = participants.length;
  const winnerCount = Math.min(gData.winner_count, count);
  const winners = [];

  if (count > 0) {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    for (let i = 0; i < winnerCount; i++) {
      winners.push(shuffled[i].user_id);
    }
  }

  try {
    const guild = await client.guilds.fetch(gData.guild_id).catch(() => null);
    if (!guild) return;
    const channel = guild.channels.cache.get(gData.channel_id);
    if (!channel) return;
    const msg = await channel.messages.fetch(gData.message_id).catch(() => null);
    if (!msg) return;

    const components = buildGiveawayComponents(gData, count, true, winners);
    await msg.edit({ flags: IS_V2, components });

    const winnerMentions = winners.map(w => `<@${w}>`).join('\n');
    const endComponents = [
      container([
        text(`## Розыгрыш завершён!\n> **Победител${winners.length > 1 ? 'и' : 'ь'} :**\n${winnerMentions || 'Нет участников'}`),
        separator(),
        text(`<a:grownwh:1481735043150778480> *Напиши спонсору в лс чтобы забрать приз.*`),
      ]),
    ];

    await channel.send({
      flags: IS_V2,
      components: endComponents,
      reply: { messageReference: msg.id },
    });
  } catch {}
}

module.exports = { data, execute, buildGiveawayComponents, scheduleGiveaway, endGiveaway };
