const { container, text, separator, v2, IS_V2 } = require('../utils/components');
const { getMarriage, deleteMarriage } = require('../database');
const { formatMs } = require('../utils/duration');

const LOVE_ROLES = ['1488588731874148422','1488588784965648655','1488588845262962799','1488588894055436412','1488588948937900283','1488588997683974225','1488589051081789450'];

async function execute(client, message, args) {
  const marriage = getMarriage(message.guild.id, message.author.id);
  if (!marriage) {
    const r = await message.reply({ ...v2([container([text('❌ Вы не состоите в браке.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const partnerId = marriage.user1_id === message.author.id ? marriage.user2_id : marriage.user1_id;
  const duration = Date.now() - Number(marriage.married_at);

  deleteMarriage(marriage.id);

  for (const uid of [message.author.id, partnerId]) {
    const m = message.guild.members.cache.get(uid) || await message.guild.members.fetch(uid).catch(() => null);
    if (m) {
      for (const rId of LOVE_ROLES) {
        await m.roles.remove(rId).catch(() => {});
      }
    }
  }

  const partner = message.guild.members.cache.get(partnerId);
  await message.channel.send({
    flags: IS_V2,
    components: [
      container([
        text(`**<@${message.author.id}> развелся с <@${partnerId}> <:QQ:1443288998972887172>**`),
        separator(),
        text(`<a:grownwh:1481735043150778480> **Ваш брак длился :** \`${formatMs(duration)}\``),
        separator(),
      ]),
    ],
  });
}

module.exports = { execute };
