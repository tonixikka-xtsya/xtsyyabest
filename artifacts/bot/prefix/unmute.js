const { container, text, v2, IS_V2 } = require('../utils/components');
const { hasAnyRole, canModerate, CAN_MUTE_ROLES, PUNISHMENT_ROLE } = require('../utils/hierarchy');
const { getCase, getCaseByTarget, updateCase } = require('../database');
const { buildLogComponents, buildDmComponents } = require('./mute');
const { formatDuration } = require('../utils/duration');

async function execute(client, message, args) {
  if (!hasAnyRole(message.member, CAN_MUTE_ROLES)) {
    const r = await message.reply({ ...v2([container([text('❌ Недостаточно прав.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  let caseData = null;

  const caseArg = args[0];
  if (caseArg && /^#?\d+$/.test(caseArg)) {
    const caseId = parseInt(caseArg.replace('#', ''));
    caseData = getCase(caseId);
    if (!caseData || caseData.type !== 'mute' || caseData.guild_id !== message.guild.id) {
      const r = await message.reply({ ...v2([container([text(`❌ Кейс #${caseId} не найден.`)])]) });
      setTimeout(() => r.delete().catch(() => {}), 10000);
      return;
    }
  } else {
    const target = message.mentions.members.first();
    if (!target) {
      const r = await message.reply({ ...v2([container([text('❌ Укажите участника или номер кейса.')])]) });
      setTimeout(() => r.delete().catch(() => {}), 10000);
      return;
    }
    caseData = getCaseByTarget(message.guild.id, target.id, 'mute');
    if (!caseData) {
      const r = await message.reply({ ...v2([container([text('❌ Активный мут не найден.')])]) });
      setTimeout(() => r.delete().catch(() => {}), 10000);
      return;
    }
  }

  if (caseData.status !== 'active') {
    const r = await message.reply({ ...v2([container([text(`❌ Кейс #${caseData.id} уже закрыт.`)])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const target = await message.guild.members.fetch(caseData.target_id).catch(() => null);
  if (target) {
    await target.roles.remove(PUNISHMENT_ROLE).catch(() => {});
    await target.timeout(null).catch(() => {});
  }

  updateCase(caseData.id, { status: 'closed' });

  if (caseData.log_message_id && caseData.log_channel_id) {
    try {
      const logCh = message.guild.channels.cache.get(caseData.log_channel_id);
      if (logCh) {
        const logMsg = await logCh.messages.fetch(caseData.log_message_id).catch(() => null);
        if (logMsg) {
          const mod = await client.users.fetch(caseData.moderator_id).catch(() => ({ id: caseData.moderator_id }));
          const t = { id: caseData.target_id };
          await logMsg.edit({
            flags: IS_V2,
            components: [
              ...buildLogComponents(caseData.id, mod, t, caseData.reason, caseData.duration, caseData.expires_at),
            ],
          });
        }
      }
    } catch {}
  }

  if (caseData.dm_message_id && caseData.dm_channel_id) {
    try {
      const modUser = await client.users.fetch(caseData.moderator_id).catch(() => null);
      if (modUser) {
        const dmCh = await modUser.createDM().catch(() => null);
        if (dmCh) {
          const dmMsg = await dmCh.messages.fetch(caseData.dm_message_id).catch(() => null);
          if (dmMsg) {
            const mod = { id: caseData.moderator_id };
            const t = { id: caseData.target_id };
            await dmMsg.edit({
              flags: IS_V2,
              components: buildDmComponents(caseData.id, mod, t, caseData.reason, caseData.duration, caseData.expires_at, 'Закрыт', true),
            });
          }
        }
      }
    } catch {}
  }

  const r = await message.reply({ ...v2([container([text(`✅ Мут с <@${caseData.target_id}> снят. Кейс **#${caseData.id}** закрыт.`)])]) });
  setTimeout(() => r.delete().catch(() => {}), 10000);
}

module.exports = { execute };
