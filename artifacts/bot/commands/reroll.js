const { container, text, separator, v2, IS_V2 } = require('../utils/components');
const { db } = require('../database');
const { buildGiveawayComponents } = require('./giveaway');

const GIVEAWAY_ROLES = ['1478848229733962002', '1407804721640640542', '1429169517119934685', '1404872037624709152'];

const data = {
  name: 'reroll',
  description: 'Перевыбрать победителя розыгрыша',
  options: [
    { type: 4, name: 'розыгрыш', description: 'ID розыгрыша', required: true, min_value: 1 },
    { type: 4, name: 'победители', description: 'Количество победителей (по умолчанию как в исходном)', required: false, min_value: 1 },
  ],
};

async function execute(client, interaction) {
  const hasRole = GIVEAWAY_ROLES.some(id => interaction.member.roles.cache.has(id));
  if (!hasRole) {
    return interaction.reply({ ...v2([container([text('❌ У вас нет прав для управления розыгрышами.')])], true) });
  }

  const gId = interaction.options.getInteger('розыгрыш');
  const winnerCount = interaction.options.getInteger('победители') ?? null;
  const gData = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(gId);

  if (!gData) {
    return interaction.reply({ ...v2([container([text(`❌ Розыгрыш #${gId} не найден.`)])], true) });
  }
  if (!gData.ended) {
    return interaction.reply({ ...v2([container([text('❌ Розыгрыш ещё не завершён.')])], true) });
  }

  const participants = db.prepare('SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?').all(gId);
  if (!participants.length) {
    return interaction.reply({ ...v2([container([text('❌ Нет участников для перевыбора.')])], true) });
  }

  const count = winnerCount ?? gData.winner_count;
  const actualCount = Math.min(count, participants.length);
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, actualCount).map(p => p.user_id);

  try {
    const guild = interaction.guild;
    const channel = guild.channels.cache.get(gData.channel_id);
    if (channel && gData.message_id) {
      const msg = await channel.messages.fetch(gData.message_id).catch(() => null);
      if (msg) {
        const components = buildGiveawayComponents(gData, participants.length, true, winners);
        await msg.edit({ flags: IS_V2, components }).catch(() => {});
      }
    }

    const winStr = winners.map(w => `<@${w}>`).join(', ');
    await interaction.reply({
      flags: IS_V2,
      components: [container([
        text(`🎉 Реролл розыгрыша **${gData.item}** (#${gId})\nНовый победитель${winners.length > 1 ? 'и' : ''}: ${winStr}`),
      ])],
    });
  } catch (e) {
    await interaction.reply({ ...v2([container([text('❌ Не удалось обновить сообщение розыгрыша.')])], true) });
  }
}

module.exports = { data, execute };
