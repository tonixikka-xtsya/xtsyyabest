const { container, text, separator, actionRow, button, customEmoji, v2, IS_V2 } = require('../utils/components');
const { getMarriage } = require('../database');

async function execute(client, message, args) {
  const target = message.mentions.members.first();
  if (!target) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите пользователя: `?marry @user`')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }
  if (target.id === message.author.id) {
    const r = await message.reply({ ...v2([container([text('❌ Нельзя предложить самому себе.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }
  if (target.user.bot) {
    const r = await message.reply({ ...v2([container([text('❌ Нельзя предложить боту.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const existingA = getMarriage(message.guild.id, message.author.id);
  if (existingA) {
    const r = await message.reply({ ...v2([container([text('❌ Вы уже состоите в браке. Сначала разведитесь: `?divorce`')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }
  const existingB = getMarriage(message.guild.id, target.id);
  if (existingB) {
    const r = await message.reply({ ...v2([container([text(`❌ <@${target.id}> уже состоит в браке.`)])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const components = [
    container([
      text(`**Минуточку внимания... <@${message.author.id}> сделал предложение руки и сердца —** <@${target.id}>`),
      separator(),
      actionRow([
        button(`marry_accept_${message.author.id}_${target.id}`, { emoji: customEmoji('1472129016126242869', 'd_heart'), style: 2 }),
        button(`marry_reject_${message.author.id}_${target.id}`, { emoji: customEmoji('1484303522760757260', 'lolove'), style: 2 }),
      ]),
    ]),
  ];

  await message.channel.send({ flags: IS_V2, components });
}

module.exports = { execute };
