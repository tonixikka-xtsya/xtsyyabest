const { container, text, separator, actionRow, button, v2, IS_V2 } = require('../utils/components');
const { getMarriage, isAlreadyChild } = require('../database');

async function execute(client, message, args) {
  const target = message.mentions.members.first();
  const marriage = getMarriage(message.guild.id, message.author.id);

  if (!marriage) {
    const r = await message.reply({ ...v2([container([text('❌ Только семейные пары могут использовать эту команду.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }
  if (!target) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите пользователя: `?daughter @user`')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }
  if (target.user.bot) {
    const r = await message.reply({ ...v2([container([text('❌ Нельзя добавить бота.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }
  if (isAlreadyChild(target.id, message.guild.id)) {
    const r = await message.reply({ ...v2([container([text(`❌ <@${target.id}> уже является чьим-то ребёнком.`)])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const p1 = marriage.user1_id;
  const p2 = marriage.user2_id;

  await message.channel.send({
    flags: IS_V2,
    components: [
      container([
        text(`### Тебе предложили стать частью (дочерью) семейной пары : <@${p1}> + <@${p2}>`),
        separator(),
        actionRow([
          button(`child_accept_${marriage.id}_${target.id}_daughter`, { label: 'Я согласна', style: 2 }),
          button(`child_reject_${marriage.id}_${target.id}_daughter`, { label: 'Отклоняю', style: 2 }),
        ]),
      ]),
    ],
  });
}

module.exports = { execute };
