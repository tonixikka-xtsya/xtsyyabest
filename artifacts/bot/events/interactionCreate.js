const { container, text, separator, actionRow, button, customEmoji, v2, IS_V2 } = require('../utils/components');
const { db, getCase, updateCase, getMarriage, createMarriage, deleteMarriage, getChildren, addChild, isAlreadyChild } = require('../database');
const { parseDuration, formatDuration } = require('../utils/duration');
const { buildLogComponents, buildDmComponents } = require('../prefix/mute');
const { buildBanLogComponents, buildBanDmComponents } = require('../prefix/ban');
const { PUNISHMENT_ROLE } = require('../utils/hierarchy');
const { buildLbPage, navButtons, buildComponents: buildLbComponents } = require('../prefix/lb');
const { buildGiveawayComponents, handleChanceButton } = require('../commands/giveaway');
const { buildMsgPage, buildMsgComponents } = require('../commands/msgcount');
const { buildLoveLbPage, buildLoveLbComponents } = require('../prefix/lovelb');

const LOVE_ROLES = {
  1: '1488588731874148422', 2: '1488588784965648655', 3: '1488588845262962799',
  4: '1488588894055436412', 5: '1488588948937900283', 6: '1488588997683974225',
  7: '1488589051081789450',
};

const slashCommands = require('../commands/index');
const commandMap = {};
for (const cmd of slashCommands) commandMap[cmd.data.name] = cmd;

async function handleInteraction(client, interaction) {
  if (interaction.isChatInputCommand()) {
    const cmd = commandMap[interaction.commandName];
    if (cmd) await cmd.execute(client, interaction).catch(console.error);
    return;
  }

  if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId.startsWith('lb_')) {
      const parts = customId.split('_');
      const action = parts[1];
      const callerId = parts[2];
      const currentPage = parseInt(parts[3]);

      if (interaction.user.id !== callerId) {
        return interaction.reply({ ...v2([container([text('❌ Только тот, кто вызвал команду, может использовать эти кнопки.')])], true) });
      }

      await interaction.deferUpdate();
      const delta = { dback: -3, back: -1, next: 1, dnext: 3 }[action] ?? 0;
      const newPage = currentPage + delta;
      await interaction.guild.members.fetch().catch(() => {});
      const { items, totalPages, safePage } = await buildLbPage(interaction.guild, newPage);
      const components = buildLbComponents(callerId, items, safePage, totalPages);
      await interaction.message.edit({ flags: IS_V2, components });
      return;
    }

    if (customId.startsWith('mc_')) {
      const parts = customId.split('_');
      const action = parts[1];
      const callerId = parts[2];
      const currentPage = parseInt(parts[3]);

      if (interaction.user.id !== callerId) {
        return interaction.reply({ ...v2([container([text('❌ Только тот, кто вызвал команду, может использовать эти кнопки.')])], true) });
      }

      await interaction.deferUpdate();
      const delta = { dback: -3, back: -1, next: 1, dnext: 3 }[action] ?? 0;
      const newPage = currentPage + delta;
      await interaction.guild.members.fetch().catch(() => {});
      const { items, totalPages, safePage } = await buildMsgPage(interaction.guild, newPage);
      const components = buildMsgComponents(callerId, items, safePage, totalPages);
      await interaction.message.edit({ flags: IS_V2, components });
      return;
    }

    if (customId.startsWith('lovelb_')) {
      const parts = customId.split('_');
      const action = parts[1];
      const callerId = parts[2];
      const currentPage = parseInt(parts[3]);

      if (interaction.user.id !== callerId) {
        return interaction.reply({ ...v2([container([text('❌ Только тот, кто вызвал команду, может использовать эти кнопки.')])], true) });
      }

      await interaction.deferUpdate();
      const delta = { dback: -3, back: -1, next: 1, dnext: 3 }[action] ?? 0;
      const newPage = currentPage + delta;
      await interaction.guild.members.fetch().catch(() => {});
      const { items, totalPages, safePage } = await buildLoveLbPage(interaction.guild, newPage);
      const components = buildLoveLbComponents(callerId, items, safePage, totalPages);
      await interaction.message.edit({ flags: IS_V2, components });
      return;
    }

    if (customId.startsWith('giveaway_join_')) {
      await interaction.deferUpdate();
      const gId = parseInt(customId.split('_')[2]);
      const gData = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(gId);

      if (!gData || gData.ended) {
        await interaction.followUp({ ...v2([container([text('❌ Этот розыгрыш уже завершён.')])], true) });
        return;
      }

      const existing = db.prepare('SELECT 1 FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?').get(gId, interaction.user.id);

      if (existing) {
        db.prepare('DELETE FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?').run(gId, interaction.user.id);
        await interaction.followUp({
          ...v2([container([text('### Регистрация отменена\n-# Вы вышли из розыгрыша. Нажмите кнопку снова, чтобы участвовать.')])], true),
        });
      } else {
        db.prepare('INSERT OR IGNORE INTO giveaway_participants (giveaway_id, user_id) VALUES (?, ?)').run(gId, interaction.user.id);
        await interaction.followUp({
          ...v2([container([text('### Вы успешно зарегистрировались на розыгрыш!!!\n-# Чтобы отменить регистрацию, кликните на кнопку повторно')])], true),
        });
      }

      const count = db.prepare('SELECT COUNT(*) as cnt FROM giveaway_participants WHERE giveaway_id = ?').get(gId);
      const participantCount = count ? Number(count.cnt) : 0;
      const components = buildGiveawayComponents(gData, participantCount);
      await interaction.message.edit({ flags: IS_V2, components }).catch(() => {});
      return;
    }

    if (customId.startsWith('giveaway_chance_')) {
      await handleChanceButton(interaction);
      return;
    }

    if (customId.startsWith('giveaway_members_')) {
      await interaction.deferUpdate();
      const gId = parseInt(customId.split('_')[2]);
      const participants = db.prepare('SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?').all(gId);

      if (!participants.length) {
        await interaction.followUp({ ...v2([container([text('*Участников пока нет*')])], true) });
        return;
      }

      const lines = participants.map((p, i) => `${i + 1}. <@${p.user_id}>`).join('\n');
      await interaction.followUp({
        ...v2([container([text(`### Участники розыгрыша (${participants.length})\n${lines}`)])], true),
      });
      return;
    }

    if (customId.startsWith('marry_accept_') || customId.startsWith('marry_reject_')) {
      const parts = customId.split('_');
      const isAccept = parts[1] === 'accept';
      const proposerId = parts[2];
      const targetId = parts[3];

      if (interaction.user.id !== targetId) {
        return interaction.reply({ ...v2([container([text('❌ Только адресат предложения может принять или отклонить его.')])], true) });
      }

      if (!isAccept) {
        await interaction.deferUpdate();
        await interaction.message.edit({
          flags: IS_V2,
          components: [container([text(`💔 <@${targetId}> отклонил предложение <@${proposerId}>.`)])],
        }).catch(() => {});
        return;
      }

      const existingA = getMarriage(interaction.guild.id, proposerId);
      const existingB = getMarriage(interaction.guild.id, targetId);
      if (existingA || existingB) {
        return interaction.reply({ ...v2([container([text('❌ Один из участников уже состоит в браке.')])], true) });
      }

      const marriageId = createMarriage({
        guild_id: interaction.guild.id,
        user1_id: proposerId,
        user2_id: targetId,
        proposer_id: proposerId,
        married_at: Date.now(),
      });

      const loveRole1 = LOVE_ROLES[1];
      for (const uid of [proposerId, targetId]) {
        const m = interaction.guild.members.cache.get(uid) || await interaction.guild.members.fetch(uid).catch(() => null);
        if (m && loveRole1) await m.roles.add(loveRole1).catch(() => {});
      }

      await interaction.deferUpdate();
      await interaction.message.edit({
        flags: IS_V2,
        components: [container([text(`💕 **<@${proposerId}> и <@${targetId}> теперь в браке!** *Поздравляем молодожёнов!*`)])],
      }).catch(() => {});
      return;
    }

    if (customId.startsWith('child_accept_') || customId.startsWith('child_reject_')) {
      const parts = customId.split('_');
      const isAccept = parts[1] === 'accept';
      const marriageIdStr = parts[2];
      const childId = parts[3];
      const role = parts[4];

      if (interaction.user.id !== childId) {
        return interaction.reply({ ...v2([container([text('❌ Только адресат предложения может принять или отклонить его.')])], true) });
      }

      if (!isAccept) {
        await interaction.deferUpdate();
        await interaction.message.edit({
          flags: IS_V2,
          components: [container([text(`<@${childId}> отклонил предложение о вступлении в семью.`)])],
        }).catch(() => {});
        return;
      }

      const marriageId = parseInt(marriageIdStr);
      const marriage = db.prepare('SELECT * FROM marriages WHERE id = ?').get(marriageId);
      if (!marriage) {
        return interaction.reply({ ...v2([container([text('❌ Семья не найдена. Возможно, брак был расторгнут.')])], true) });
      }
      if (isAlreadyChild(childId, interaction.guild.id)) {
        return interaction.reply({ ...v2([container([text('❌ Вы уже состоите в другой семье.')])], true) });
      }

      addChild(marriageId, childId, interaction.guild.id, role);
      const roleWord = role === 'son' ? 'сын' : 'дочь';
      await interaction.deferUpdate();
      await interaction.message.edit({
        flags: IS_V2,
        components: [container([text(`✅ <@${childId}> принял(а) предложение и стал(а) ${roleWord === 'сын' ? '**сыном**' : '**дочерью**'} пары <@${marriage.user1_id}> + <@${marriage.user2_id}>!`)])],
      }).catch(() => {});
      return;
    }

    if (customId.startsWith('card_reply_')) {
      const parts = customId.split('_');
      const senderId = parts[2];
      const recipientId = parts[3];

      if (interaction.user.id !== recipientId) {
        return interaction.reply({ ...v2([container([text('❌ Только получатель открытки может ответить.')])], true) });
      }

      await interaction.showModal({
        title: 'Ответить на открытку',
        custom_id: `card_modal_reply_${senderId}`,
        components: [{
          type: 1,
          components: [{
            type: 4,
            custom_id: 'reply_text',
            label: 'Ваш ответ',
            style: 2,
            placeholder: 'Введите ваш ответ...',
            max_length: 1000,
            required: true,
          }],
        }],
      });
      return;
    }

    if (customId.startsWith('mod_reason_') || customId.startsWith('mod_time_') || customId.startsWith('mod_remove_')) {
      const parts = customId.split('_');
      const action = parts[1];
      const caseId = parseInt(parts[2]);
      const caseData = getCase(caseId);

      if (!caseData) return interaction.reply({ ...v2([container([text('❌ Кейс не найден.')])], true) });
      if (caseData.moderator_id !== interaction.user.id) {
        return interaction.reply({ ...v2([container([text('❌ Это не ваша панель управления.')])], true) });
      }
      if (caseData.status !== 'active') {
        return interaction.reply({ ...v2([container([text('❌ Наказание уже истекло или снято.')])], true) });
      }

      if (action === 'remove') {
        await removePunishment(client, interaction, caseData);
        return;
      }

      if (action === 'reason') {
        await interaction.showModal({
          title: 'Изменить причину',
          custom_id: `mod_modal_reason_${caseId}`,
          components: [{
            type: 1,
            components: [{
              type: 4,
              custom_id: 'new_reason',
              label: 'Новая причина',
              style: 2,
              value: caseData.reason || '',
              max_length: 500,
              required: true,
            }],
          }],
        });
        return;
      }

      if (action === 'time') {
        await interaction.showModal({
          title: 'Изменить время наказания',
          custom_id: `mod_modal_time_${caseId}`,
          components: [{
            type: 1,
            components: [{
              type: 4,
              custom_id: 'new_time',
              label: 'Новое время (например 1h, 30m, 2d)',
              style: 1,
              placeholder: '10m, 1h, 2d ...',
              max_length: 50,
              required: true,
            }],
          }],
        });
        return;
      }
    }
  }

  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith('card_modal_reply_')) {
      const senderId = customId.split('_')[3];
      const replyText = interaction.fields.getTextInputValue('reply_text');

      try {
        const sender = await client.users.fetch(senderId);
        const dmCh = await sender.createDM();
        await dmCh.send({
          flags: IS_V2,
          components: [
            container([
              text(
                `### Новое послание!\n` +
                `<a:grownwh:1481735043150778480> **От:**\n> -# *<@${interaction.user.id}>*\n` +
                `<a:grownwh:1481735043150778480> **Для:**\n> -# *<@${senderId}>*`
              ),
              separator(),
              text(`<a:grownwh:1481735043150778480> **Послание :**\n> -# *${replyText}*`),
            ]),
          ],
        });
        await interaction.reply({ ...v2([container([text('✅ Ваш ответ отправлен!')])], true) });
      } catch {
        await interaction.reply({ ...v2([container([text('❌ Не удалось отправить ответ. Возможно, у пользователя закрыты ЛС.')])], true) });
      }
      return;
    }

    if (customId.startsWith('mod_modal_reason_')) {
      const caseId = parseInt(customId.split('_')[3]);
      const newReason = interaction.fields.getTextInputValue('new_reason');
      const caseData = getCase(caseId);
      if (!caseData) return interaction.reply({ ...v2([container([text('❌ Кейс не найден.')])], true) });

      updateCase(caseId, { reason: newReason });
      await updateModMessages(client, interaction.guild, { ...caseData, reason: newReason });
      return interaction.reply({ ...v2([container([text(`✅ Причина обновлена: **${newReason}**`)])], true) });
    }

    if (customId.startsWith('mod_modal_time_')) {
      const caseId = parseInt(customId.split('_')[3]);
      const newTimeStr = interaction.fields.getTextInputValue('new_time');
      const caseData = getCase(caseId);
      if (!caseData) return interaction.reply({ ...v2([container([text('❌ Кейс не найден.')])], true) });

      const newDuration = parseDuration(newTimeStr);
      if (!newDuration) return interaction.reply({ ...v2([container([text('❌ Неверный формат времени. Пример: `1h`, `30m`')])], true) });

      const newExpiresAt = Date.now() + newDuration;
      updateCase(caseId, { duration: newDuration, expires_at: newExpiresAt });

      if (caseData.type === 'mute') {
        const guild = interaction.guild || (await client.guilds.fetch(caseData.guild_id).catch(() => null));
        if (guild) {
          const member = await guild.members.fetch(caseData.target_id).catch(() => null);
          if (member && newDuration <= 28 * 24 * 3600 * 1000) {
            await member.timeout(newDuration, caseData.reason).catch(() => {});
          }
        }
      }

      await updateModMessages(client, interaction.guild, { ...caseData, duration: newDuration, expires_at: newExpiresAt });
      return interaction.reply({ ...v2([container([text(`✅ Время наказания обновлено: **${formatDuration(newDuration)}**`)])], true) });
    }
  }
}

async function removePunishment(client, interaction, caseData) {
  const guild = interaction.guild || (await client.guilds.fetch(caseData.guild_id).catch(() => null));
  if (guild) {
    if (caseData.type === 'mute') {
      const member = await guild.members.fetch(caseData.target_id).catch(() => null);
      if (member) {
        await member.roles.remove(PUNISHMENT_ROLE).catch(() => {});
        await member.timeout(null).catch(() => {});
      }
    } else if (caseData.type === 'ban') {
      await guild.bans.remove(caseData.target_id).catch(() => {});
    }
  }

  updateCase(caseData.id, { status: 'closed' });
  await updateModMessages(client, guild, { ...caseData, status: 'closed' }, true);
  await interaction.reply({ ...v2([container([text(`✅ Наказание с кейса **#${caseData.id}** снято.`)])], true) });
}

async function updateModMessages(client, guild, caseData, disabled = false) {
  const isMute = caseData.type === 'mute';
  const status = caseData.status === 'closed' ? 'Закрыт' : 'Активен';

  if (caseData.log_message_id && caseData.log_channel_id) {
    try {
      const g = guild || (await client.guilds.fetch(caseData.guild_id).catch(() => null));
      if (g) {
        const logCh = g.channels.cache.get(caseData.log_channel_id);
        if (logCh) {
          const logMsg = await logCh.messages.fetch(caseData.log_message_id).catch(() => null);
          if (logMsg) {
            const mod = { id: caseData.moderator_id };
            const t = { id: caseData.target_id };
            const comps = isMute
              ? buildLogComponents(caseData.id, mod, t, caseData.reason, caseData.duration, caseData.expires_at)
              : buildBanLogComponents(caseData.id, mod, t, caseData.reason);
            await logMsg.edit({ flags: IS_V2, components: comps });
          }
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
            const comps = isMute
              ? buildDmComponents(caseData.id, mod, t, caseData.reason, caseData.duration, caseData.expires_at, status, disabled || caseData.status === 'closed')
              : buildBanDmComponents(caseData.id, mod, t, caseData.reason, status, disabled || caseData.status === 'closed');
            await dmMsg.edit({ flags: IS_V2, components: comps });
          }
        }
      }
    } catch {}
  }
}

module.exports = { handleInteraction };
