const { container, text, v2, IS_V2 } = require('../utils/components');
const { hasAnyRole, CAN_BAN_ROLES } = require('../utils/hierarchy');
const { getCase, getCaseByTarget, updateCase } = require('../database');
const { buildBanLogComponents, buildBanDmComponents } = require('./ban');

async function execute(client, message, args) {
  if (!hasAnyRole(message.member, CAN_BAN_ROLES)) {
    const r = await message.reply({ ...v2([container([text('❌ Недостаточно прав.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  let caseData = null;
  let targetId = null;

  const caseArg = args[0];
  if (caseArg && /^#?\d+$/.test(caseArg)) {
    const caseId = parseInt(caseArg.replace('#', ''));
    caseData = getCase(caseId);
    if (!caseData || caseData.type !== 'ban' || caseData.guild_id !== message.guild.id) {
      const r = await message.reply({ ...v2([container([text(`❌ Кейс #${caseId} не найден.`)])]) });
      setTimeout(() => r.delete().catch(() => {}), 10000);
      return;
    }
    targetId = caseData.target_id;
  } else {
    const mentionId = message.mentions.users.first()?.id;
    const rawId = mentionId || caseArg;
    if (!rawId || !/^\d+$/.test(rawId)) {
      const r = await message.reply({ ...v2([container([text('❌ Укажите пользователя или номер кейса.')])]) });
      setTimeout(() => r.delete().catch(() => {}), 10000);
      return;
    }
    targetId = rawId;
    caseData = getCaseByTarget(message.guild.id, targetId, 'ban');
  }

  if (caseData && caseData.status !== 'active') {
    const r = await message.reply({ ...v2([container([text(`❌ Кейс #${caseData.id} уже закрыт.`)])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  await message.guild.bans.remove(targetId).catch(() => {});

  if (caseData) {
    updateCase(caseData.id, { status: 'closed' });

    if (caseData.log_message_id && caseData.log_channel_id) {
      try {
        const logCh = message.guild.channels.cache.get(caseData.log_channel_id);
        if (logCh) {
          const logMsg = await logCh.messages.fetch(caseData.log_message_id).catch(() => null);
          if (logMsg) {
            const mod = { id: caseData.moderator_id };
            const t = { id: caseData.target_id };
            await logMsg.edit({ flags: IS_V2, components: buildBanLogComponents(caseData.id, mod, t, caseData.reason) });
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
              await dmMsg.edit({
                flags: IS_V2,
                components: buildBanDmComponents(caseData.id, { id: caseData.moderator_id }, { id: caseData.target_id }, caseData.reason, 'Закрыт', true),
              });
            }
          }
        }
      } catch {}
    }
  }

  const r = await message.reply({ ...v2([container([text(`✅ Пользователь <@${targetId}> разбанен.${caseData ? ` Кейс **#${caseData.id}** закрыт.` : ''}`)])]) });
  setTimeout(() => r.delete().catch(() => {}), 10000);
}

module.exports = { execute };
