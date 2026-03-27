const { container, text, separator, actionRow, button, customEmoji, v2, IS_V2 } = require('../utils/components');

const CARD_LOG_CHANNEL = '1480682324881313964';

const data = {
  name: 'открытка',
  description: 'Отправить открытку пользователю',
  options: [
    { type: 6, name: 'получатель', description: 'Кому отправить открытку', required: true },
    { type: 3, name: 'сообщение', description: 'Текст открытки', required: true },
    { type: 5, name: 'анонимно', description: 'Отправить анонимно?', required: false },
  ],
};

async function execute(client, interaction) {
  const recipient = interaction.options.getUser('получатель');
  const message = interaction.options.getString('сообщение');
  const anonymous = interaction.options.getBoolean('анонимно') ?? false;

  if (recipient.id === interaction.user.id) {
    return interaction.reply({
      ...v2([container([text('❌ Нельзя отправить открытку самому себе.')])], true),
    });
  }

  const fromText = anonymous ? '-# *Анонимное сообщение*' : `-# *<@${interaction.user.id}>*`;

  const cardComponents = [
    container([
      text(
        `### Новое послание!\n` +
        `<a:grownwh:1481735043150778480> **От:**\n> ${fromText}\n` +
        `<a:grownwh:1481735043150778480> **Для:**\n> -# *<@${recipient.id}>*`
      ),
      separator(),
      text(`<a:grownwh:1481735043150778480> **Послание :**\n> -# *${message}*`),
      actionRow([
        button(`card_reply_${interaction.user.id}_${recipient.id}`, {
          emoji: customEmoji('1486723667789353103', 'respohe', true),
          label: 'Ответить',
          style: 1,
        }),
      ]),
    ]),
  ];

  const logChannel = interaction.guild?.channels.cache.get(CARD_LOG_CHANNEL);
  if (logChannel) {
    await logChannel.send({ flags: IS_V2, components: cardComponents });
  }

  try {
    const recipientMember = await interaction.guild?.members.fetch(recipient.id).catch(() => null);
    if (recipientMember) {
      const dmChannel = await recipient.createDM().catch(() => null);
      if (dmChannel) {
        await dmChannel.send({ flags: IS_V2, components: cardComponents });
      }
    }
  } catch {}

  await interaction.reply({
    ...v2([container([text(`✅ Открытка успешно отправлена <@${recipient.id}>!`)])], true),
  });
}

module.exports = { data, execute };
