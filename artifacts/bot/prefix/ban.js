const { container, text, separator, actionRow, button, customEmoji, v2, IS_V2 } = require('../utils/components');
const { hasAnyRole, canModerate, CAN_BAN_ROLES } = require('../utils/hierarchy');
const { createCase, updateCase } = require('../database');

const MOD_LOG = '1480074064386199552';

function buildBanLogComponents(caseId, mod, target, reason) {
  return [
    container([
      text(`## __Кейс #${caseId}__`),
      separator(),
      text(
        `<a:grownwh:1481735043150778480> Модератор : <@${mod.id}> / \`${mod.id}\`\n` +
        `<a:grownwh:1481735043150778480> Действие : ban / бан\n` +
        `<a:grownwh:1481735043150778480> Участник : <@${target.id}> / \`${target.id}\`\n` +
        `<a:grownwh:1481735043150778480> Причина : ${reason}`
      ),
    ]),
  ];
}

function buildBanDmComponents(caseId, mod, target, reason, status = 'Активен', disabled = false) {
  return [
    container([
      text('### Бан был успешно выдан'),
      separator(),
      text(
        `<a:grownwh:1481735043150778480> Пользователь : <@${target.id}> / \`${target.id}\`\n` +
        `<a:grownwh:1481735043150778480> Модератор : <@${mod.id}> / \`${mod.id}\``
      ),
      separator(),
      text(`<a:grownwh:1481735043150778480> Причина : ${reason}`),
      separator(),
      text(
        `<a:grownwh:1481735043150778480> Кейс : #${caseId}\n` +
        `<a:grownwh:1481735043150778480> Статус : ${status}`
      ),
      separator(),
      text(
        `<:pencil:1485261784775397609> **— изменить причину**\n` +
        `<:offmute:1484249190933463252> **— снять бан**`
      ),
      separator(),
      actionRow([
        button(`mod_reason_${caseId}`, { emoji: customEmoji('1485261784775397609', 'pencil'), style: 2, disabled }),
        button(`mod_remove_${caseId}`, { emoji: customEmoji('1484249190933463252', 'offmute'), style: 2, disabled }),
      ]),
    ]),
  ];
}

async function execute(client, message, args) {
  if (!hasAnyRole(message.member, CAN_BAN_ROLES)) {
    const r = await message.reply({ ...v2([container([text('❌ Недостаточно прав.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const target = message.mentions.members.first();
  if (!target) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите участника. Пример: `?ban @user причина`')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  if (!canModerate(message.member, target)) {
    const r = await message.reply({ ...v2([container([text('❌ Вы не можете забанить этого участника.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const reason = args.slice(1).join(' ') || 'Не указана';
  const now = Date.now();

  const caseId = createCase({
    guild_id: message.guild.id,
    type: 'ban',
    moderator_id: message.author.id,
    target_id: target.id,
    reason,
    duration: null,
    expires_at: null,
    created_at: now,
  });

  await target.ban({ reason }).catch(() => {});

  const logChannel = message.guild.channels.cache.get(MOD_LOG);
  if (logChannel) {
    const logMsg = await logChannel.send({
      flags: IS_V2,
      components: buildBanLogComponents(caseId, message.author, target, reason),
    });
    updateCase(caseId, { log_message_id: logMsg.id, log_channel_id: logChannel.id });
  }

  try {
    const dm = await message.author.createDM();
    const dmMsg = await dm.send({
      flags: IS_V2,
      components: buildBanDmComponents(caseId, message.author, target, reason),
    });
    updateCase(caseId, { dm_message_id: dmMsg.id, dm_channel_id: dm.id });
  } catch {}

  const r = await message.reply({ ...v2([container([text(`✅ <@${target.id}> забанен. Кейс **#${caseId}**`)])]) });
  setTimeout(() => r.delete().catch(() => {}), 10000);
}

module.exports = { execute, buildBanLogComponents, buildBanDmComponents };
