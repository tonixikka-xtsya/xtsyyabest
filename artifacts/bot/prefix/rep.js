const { container, text, separator, IS_V2 } = require('../utils/components');
const { hasGivenRep, addRep, getOrCreateUser } = require('../database');

async function execute(client, message, args) {
  const target = message.mentions.members.first();

  if (!target) {
    return message.reply('❌ Укажите участника. Пример: `?rep @user`').then(r => setTimeout(() => r.delete().catch(() => {}), 10000));
  }

  if (target.id === message.author.id) {
    return message.channel.send({
      flags: IS_V2,
      components: [container([text('❌ Нельзя выдать респект самому себе.')])],
    }).then(r => setTimeout(() => r.delete().catch(() => {}), 10000));
  }

  if (hasGivenRep(message.author.id, target.id, message.guild.id)) {
    return message.channel.send({
      flags: IS_V2,
      components: [container([text(`❌ Вы уже выдавали респект <@${target.id}>.`)])],
    }).then(r => setTimeout(() => r.delete().catch(() => {}), 10000));
  }

  addRep(message.author.id, target.id, message.guild.id);

  await message.channel.send({
    flags: IS_V2,
    components: [
      container([
        text(`**${message.member.displayName}** выдал респект — **${target.displayName}**`),
      ]),
    ],
  });
}

module.exports = { execute };
