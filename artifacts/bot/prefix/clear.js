const { container, text, v2 } = require('../utils/components');
const { hasAnyRole, CAN_CLEAR_ROLES } = require('../utils/hierarchy');
const { parseDuration } = require('../utils/duration');

async function execute(client, message, args) {
  if (!hasAnyRole(message.member, CAN_CLEAR_ROLES)) {
    const r = await message.reply({ ...v2([container([text('❌ Недостаточно прав.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  if (!args.length) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите количество или время. Примеры:\n`?clear 100`\n`?clear @user 50`\n`?clear 2h`\n`?clear @user 1h`')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  let targetUser = null;
  let remaining = [...args];

  if (message.mentions.users.size > 0) {
    targetUser = message.mentions.users.first();
    remaining = args.filter(a => !a.includes(targetUser.id) && !a.startsWith('<@'));
  }

  const param = remaining[0];
  let count = null;
  let durationMs = null;

  if (/^\d+$/.test(param)) {
    count = Math.min(parseInt(param), 1000);
  } else {
    durationMs = parseDuration(param);
    if (!durationMs) {
      const r = await message.reply({ ...v2([container([text('❌ Неверный формат. Используйте число или время (например `2h`, `30m`).')])]) });
      setTimeout(() => r.delete().catch(() => {}), 10000);
      return;
    }
  }

  let deleted = 0;
  const commandMsgId = message.id;

  if (count !== null) {
    let fetched;
    let lastId = null;
    let remaining2 = count;

    while (remaining2 > 0) {
      const limit = Math.min(remaining2, 100);
      const opts = { limit: 100 };
      if (lastId) opts.before = lastId;

      fetched = await message.channel.messages.fetch(opts);
      let msgs = fetched.filter(m => m.id !== commandMsgId);
      if (targetUser) msgs = msgs.filter(m => m.author.id === targetUser.id);

      const toDelete = [...msgs.values()].slice(0, limit);
      if (!toDelete.length) break;

      const chunk = toDelete.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 3600 * 1000);
      if (chunk.length > 1) {
        await message.channel.bulkDelete(chunk, true).catch(() => {});
        deleted += chunk.length;
      } else if (chunk.length === 1) {
        await chunk[0].delete().catch(() => {});
        deleted += 1;
      }

      remaining2 -= limit;
      lastId = fetched.last()?.id;
      if (fetched.size < 100) break;
    }
  } else if (durationMs !== null) {
    const cutoff = Date.now() - durationMs;
    let lastId = null;
    let stop = false;

    while (!stop) {
      const opts = { limit: 100 };
      if (lastId) opts.before = lastId;

      const fetched = await message.channel.messages.fetch(opts);
      if (!fetched.size) break;

      let msgs = fetched.filter(m => m.id !== commandMsgId && m.createdTimestamp >= cutoff);
      if (targetUser) msgs = msgs.filter(m => m.author.id === targetUser.id);

      const chunk = [...msgs.values()].filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 3600 * 1000);
      if (chunk.length > 1) {
        await message.channel.bulkDelete(chunk, true).catch(() => {});
        deleted += chunk.length;
      } else if (chunk.length === 1) {
        await chunk[0].delete().catch(() => {});
        deleted += 1;
      }

      lastId = fetched.last()?.id;
      if (fetched.last()?.createdTimestamp < cutoff) stop = true;
      if (fetched.size < 100) stop = true;
    }
  }

  const userStr = targetUser ? ` от <@${targetUser.id}>` : '';
  const r = await message.channel.send({ ...v2([container([text(`✅ Удалено **${deleted}** сообщений${userStr}.`)])]) });
  setTimeout(() => r.delete().catch(() => {}), 10000);
}

module.exports = { execute };
