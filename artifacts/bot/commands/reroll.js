const { container, text, separator, v2, IS_V2 } = require('../utils/components');
const { db } = require('../database');
const { buildGiveawayComponents } = require('./giveaway');

const GIVEAWAY_ROLES = ['1478848229733962002', '1407804721640640542', '1429169517119934685', '1404872037624709152'];

const data = {
  name: 'reroll',
  description: 'Перевыбрать победителя розыгрыша',
  options: [
    { type: 3, name: 'розыгрыш', description: 'ID розыгрыша или ID сообщения', required: true },
    { type: 4, name: 'победители', description: 'Количество победителей (по умолчанию как в исходном)', required: false, min_value: 1 },
    { type: 6, name: 'исключить', description: 'Юзер, которого исключить из реролла', required: false },
  ],
};

async function execute(client, interaction) {
  const hasRole = GIVEAWAY_ROLES.some(id => interaction.member.roles.cache.has(id));
  if (!hasRole) {
    return interaction.reply({ ...v2([container([text('❌ У вас нет прав для управления розыгрышами.')])], true) });
  }

  const gInput = interaction.options.getString('розыгрыш');
  const winnerCount = interaction.options.getInteger('победители') ?? null;
  const excludeUser = interaction.options.getUser('исключить');
  const gData = db.prepare('SELECT * FROM giveaways WHERE id = ? OR message_id = ?').get(gInput, gInput);

  if (!gData) {
    return interaction.reply({ ...v2([container([text(`❌ Розыгрыш не найден.`)])], true) });
  }
  if (!gData.ended) {
    return interaction.reply({ ...v2([container([text('❌ Розыгрыш ещё не завершён.')])], true) });
  }

  const participants = db.prepare('SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?').all(gData.id);
  if (!participants.length) {
    return interaction.reply({ ...v2([container([text('❌ Нет участников для перевыбора.')])], true) });
  }

  const filtered = excludeUser
    ? participants.filter(p => p.user_id !== excludeUser.id)
    : participants;

  if (!filtered.length) {
    return interaction.reply({ ...v2([container([text('❌ Нет участников для перевыбора после исключения.')])], true) });
  }

  const count = winnerCount ?? gData.winner_count;
  const actualCount = Math.min(count, filtered.length);
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
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
    const excludeStr = excludeUser ? ` (исключён: <@${excludeUser.id}>)` : '';
    await interaction.reply({
      flags: IS_V2,
      components: [container([
        text(`🎉 Реролл розыгрыша **${gData.item}** (#${gData.id})${excludeStr}\nНовый победитель${winners.length > 1 ? 'и' : ''}: ${winStr}`),
      ])],
    });
  } catch (e) {
    await interaction.reply({ ...v2([container([text('❌ Не удалось обновить сообщение розыгрыша.')])], true) });
  }
}

module.exports = { data, execute };
