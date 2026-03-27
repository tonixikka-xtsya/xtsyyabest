const { container, text, separator, IS_V2 } = require('../utils/components');

const MSG_LOG = '1253713306527731804';

async function handleMessageUpdate(client, oldMsg, newMsg) {
  if (!newMsg.guild) return;
  if (newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const logChannel = newMsg.guild.channels.cache.get(MSG_LOG);
  if (!logChannel) return;

  const author = newMsg.author;
  const channel = newMsg.channel;
  const oldContent = oldMsg.content || '*[недоступно]*';
  const newContent = newMsg.content || '*[пусто]*';
  const msgId = newMsg.id;
  const ts = Math.floor((newMsg.editedTimestamp || Date.now()) / 1000);

  try {
    await logChannel.send({
      flags: IS_V2,
      components: [
        container([
          text(
            `## Сообщение было отредактировано\n` +
            `<a:grownwh:1481735043150778480> **Автор :** <@${author?.id ?? 'unknown'}> / \`${author?.id ?? 'unknown'}\`\n` +
            `<a:grownwh:1481735043150778480> Канал : <#${channel.id}>`
          ),
          separator(),
          text(
            `Старое содержимое :\n\`\`\`${oldContent.slice(0, 900)}\`\`\`\n` +
            `Новое содержимое :\n\`\`\`${newContent.slice(0, 900)}\`\`\`\n` +
            `-# ID сообщения: ${msgId} ● <t:${ts}:f>`
          ),
        ]),
      ],
    });
  } catch {}
}

module.exports = { handleMessageUpdate };
