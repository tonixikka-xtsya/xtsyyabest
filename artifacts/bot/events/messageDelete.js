const { container, text, separator, IS_V2 } = require('../utils/components');

const MSG_LOG = '1253713306527731804';

async function handleMessageDelete(client, message) {
  if (!message.guild) return;
  if (message.author?.bot) return;

  const logChannel = message.guild.channels.cache.get(MSG_LOG);
  if (!logChannel) return;

  const author = message.author;
  const channel = message.channel;
  const content = message.content || '*[контент недоступен]*';
  const msgId = message.id;
  const ts = Math.floor((message.createdTimestamp || Date.now()) / 1000);

  try {
    await logChannel.send({
      flags: IS_V2,
      components: [
        container([
          text(
            `## Сообщение было удалено\n` +
            `<a:grownwh:1481735043150778480> **Автор :** <@${author?.id ?? 'unknown'}> / \`${author?.id ?? 'unknown'}\`\n` +
            `<a:grownwh:1481735043150778480> **Канал :** <#${channel.id}>`
          ),
          separator(),
          text(
            `## Сообщение было удалено :\n\`\`\`${content.slice(0, 1800)}\`\`\`\n` +
            `-# ID сообщения: \`${msgId}\` ● <t:${ts}:f>`
          ),
        ]),
      ],
    });
  } catch {}
}

module.exports = { handleMessageDelete };
