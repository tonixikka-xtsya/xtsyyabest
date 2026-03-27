const { container, text, separator, actionRow, button, customEmoji, v2, IS_V2 } = require('../utils/components');
const { hasAnyRole, canModerate, CAN_MUTE_ROLES, PUNISHMENT_ROLE } = require('../utils/hierarchy');
const { parseDuration, formatDuration } = require('../utils/duration');
const { createCase, updateCase } = require('../database');

const MOD_LOG = '1480074064386199552';

function buildLogComponents(caseId, mod, target, reason, duration, expiresAt) {
  const dur = formatDuration(duration);
  const expStr = expiresAt ? ` (<t:${Math.floor(expiresAt / 1000)}:R>)` : '';
  return [
    container([
      text(`## __Кейс #${caseId}__`),
      separator(),
      text(
        `<a:grownwh:1481735043150778480> Модератор : <@${mod.id}> / \`${mod.id}\`\n` +
        `<a:grownwh:1481735043150778480> Действие : mute / мут\n` +
        `<a:grownwh:1481735043150778480> Участник : <@${target.id}> / \`${target.id}\`\n` +
        `<a:grownwh:1481735043150778480> Причина : ${reason}\n` +
        `<a:grownwh:1481735043150778480> Длительность : ${dur}${expStr}`
      ),
    ]),
  ];
}

function buildDmComponents(caseId, mod, target, reason, duration, expiresAt, status = 'Активен', disabled = false) {
  const dur = formatDuration(duration);
  const expStr = expiresAt ? ` (<t:${Math.floor(expiresAt / 1000)}:R>)` : '';
  return [
    container([
      text('### Мьют был успешно выдан'),
      separator(),
      text(
        `<a:grownwh:1481735043150778480> Пользователь : <@${target.id}> / \`${target.id}\`\n` +
        `<a:grownwh:1481735043150778480> Модератор : <@${mod.id}> / \`${mod.id}\``
      ),
      separator(),
      text(
        `<a:grownwh:1481735043150778480> Причина : ${reason}\n` +
        `<a:grownwh:1481735043150778480> Длительность : ${dur}${expStr}`
      ),
      separator(),
      text(
        `<a:grownwh:1481735043150778480> Кейс : #${caseId}\n` +
        `<a:grownwh:1481735043150778480> Статус : ${status}`
      ),
      separator(),
      text(
        `<:pencil:1485261784775397609> **— изменить причину**\n` +
        `<:timeng:1484247871179067554> **— изменить время наказания**\n` +
        `<:offmute:1484249190933463252> **— снять наказание**`
      ),
      separator(),
      actionRow([
        button(`mod_reason_${caseId}`, { emoji: customEmoji('1485261784775397609', 'pencil'), style: 2, disabled }),
        button(`mod_time_${caseId}`, { emoji: customEmoji('1484247871179067554', 'timeng'), style: 2, disabled }),
        button(`mod_remove_${caseId}`, { emoji: customEmoji('1484249190933463252', 'offmute'), style: 2, disabled }),
      ]),
    ]),
  ];
}

async function execute(client, message, args) {
  if (!hasAnyRole(message.member, CAN_MUTE_ROLES)) {
    const r = await message.reply({ ...v2([container([text('❌ Недостаточно прав.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const target = message.mentions.members.first();
  if (!target) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите участника. Пример: `?mute @user 10m причина`')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  if (!canModerate(message.member, target)) {
    const r = await message.reply({ ...v2([container([text('❌ Вы не можете модерировать этого участника.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const mentionLen = args[0] ? 1 : 0;
  const rest = args.slice(mentionLen);

  let duration = null;
  let reason = 'Не указана';

  if (rest.length > 0) {
    const tryDur = parseDuration(rest[0]);
    if (tryDur) {
      duration = tryDur;
      reason = rest.slice(1).join(' ') || 'Не указана';
    } else {
      reason = rest.join(' ') || 'Не указана';
    }
  }

  const now = Date.now();
  const expiresAt = duration ? now + duration : null;

  const caseId = createCase({
    guild_id: message.guild.id,
    type: 'mute',
    moderator_id: message.author.id,
    target_id: target.id,
    reason,
    duration,
    expires_at: expiresAt,
    created_at: now,
  });

  await target.roles.add(PUNISHMENT_ROLE).catch(() => {});
  if (duration && duration <= 28 * 24 * 3600 * 1000) {
    await target.timeout(duration, reason).catch(() => {});
  }

  const logChannel = message.guild.channels.cache.get(MOD_LOG);
  let logMsg = null;
  if (logChannel) {
    logMsg = await logChannel.send({
      flags: IS_V2,
      components: buildLogComponents(caseId, message.author, target, reason, duration, expiresAt),
    });
    updateCase(caseId, { log_message_id: logMsg.id, log_channel_id: logChannel.id });
  }

  const dmComponents = buildDmComponents(caseId, message.author, target, reason, duration, expiresAt);
  try {
    const dm = await message.author.createDM();
    const dmMsg = await dm.send({ flags: IS_V2, components: dmComponents });
    updateCase(caseId, { dm_message_id: dmMsg.id, dm_channel_id: dm.id });
  } catch {}

  const r = await message.reply({ ...v2([container([text(`✅ <@${target.id}> замьючен. Кейс **#${caseId}**`)])]) });
  setTimeout(() => r.delete().catch(() => {}), 10000);
}

module.exports = { execute, buildLogComponents, buildDmComponents };
