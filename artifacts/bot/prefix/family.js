const { container, text, separator, v2, IS_V2 } = require('../utils/components');
const { getMarriage, getChildren } = require('../database');
const { formatMs } = require('../utils/duration');

async function execute(client, message, args) {
  const marriage = getMarriage(message.guild.id, message.author.id);
  if (!marriage) {
    const r = await message.reply({ ...v2([container([text('❌ Вы не состоите в браке.')])]) });
    return setTimeout(() => r.delete().catch(() => {}), 10000);
  }

  const partnerId = marriage.user1_id === message.author.id ? marriage.user2_id : marriage.user1_id;
  const partner = message.guild.members.cache.get(partnerId) || await message.guild.members.fetch(partnerId).catch(() => null);
  const proposer = message.guild.members.cache.get(marriage.proposer_id) || await message.guild.members.fetch(marriage.proposer_id).catch(() => null);

  const duration = Date.now() - Number(marriage.married_at);
  const marriedTs = Math.floor(Number(marriage.married_at) / 1000);

  const children = getChildren(marriage.id);
  let childrenText = '—';
  if (children.length) {
    const names = [];
    for (const c of children) {
      const m = message.guild.members.cache.get(c.child_id) || await message.guild.members.fetch(c.child_id).catch(() => null);
      names.push(m ? m.displayName : c.child_id);
    }
    childrenText = names.join(', ');
  }

  await message.channel.send({
    flags: IS_V2,
    components: [
      container([
        text(`### Брак заключён с <@${partnerId}>`),
        separator(),
        text(`<a:grownwh:1481735043150778480> **Сделал предложение :** ${proposer?.displayName ?? marriage.proposer_id}`),
        separator(),
        text(
          `<a:grownwh:1481735043150778480> **Партнёр :** <@${partnerId}> / ${partner?.displayName ?? partnerId}\n` +
          `<a:grownwh:1481735043150778480> **В браке с :** <t:${marriedTs}:f>\n` +
          `<a:grownwh:1481735043150778480> **Длительность брака :** \`${formatMs(duration)}\``
        ),
        separator(),
        text(`<a:grownwh:1481735043150778480> **Дети :** \`${childrenText}\``),
      ]),
    ],
  });
}

module.exports = { execute };
