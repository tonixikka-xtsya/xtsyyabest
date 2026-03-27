const { container, text, separator, actionRow, button, customEmoji, v2, IS_V2 } = require('../utils/components');
const { db, getCase, updateCase } = require('../database');
const { parseDuration, formatDuration } = require('../utils/duration');
const { buildLogComponents, buildDmComponents } = require('../prefix/mute');
const { buildBanLogComponents, buildBanDmComponents } = require('../prefix/ban');
const { PUNISHMENT_ROLE } = require('../utils/hierarchy');
const { buildLbPage, navButtons } = require('../prefix/lb');
const { buildGiveawayComponents } = require('../commands/giveaway');

const slashCommands = require('../commands/index');
const commandMap = {};
for (const cmd of slashCommands) commandMap[cmd.data.name] = cmd;

async function handleInteraction(client, interaction) {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const cmd = commandMap[interaction.commandName];
    if (cmd) await cmd.execute(client, interaction).catch(console.error);
    return;
  }

  // Button interactions
  if (interaction.isButton()) {
    const { customId } = interaction;

    // Leaderboard navigation: lb_<action>_<userId>_<page>
    if (customId.startsWith('lb_')) {
      const parts = customId.split('_');
      const action = parts[1]; // dback, back, next, dnext
      const callerId = parts[2];
      const currentPage = parseInt(parts[3]);

      if (interaction.user.id !== callerId) {
        return interaction.reply({ ...v2([container([text('❌ Только тот, кто вызвал команду, может использовать эти кнопки.')])], true) });
      }

      const delta = { dback: -3, back: -1, next: 1, dnext: 3 }[action] ?? 0;
      const newPage = currentPage + delta;

      await interaction.guild.members.fetch().catch(() => {});
      const { items, totalPages, safePage } = await buildLbPage(interaction.guild, newPage);

      const components = [
        container([
          text(`### Топ рейтинга участников (Страница ${safePage + 1}/${totalPages})`),
          separator(),
          ...items,
          separator(),
          text(
            `<:dback:1485286050665599086> — возвращение на 3 страницы назад\n` +
            `<:back:1485285989999185958> — вернуться на прошлую страницу\n` +
            `<:nexttt:1484292444756512948> — перелистнуть на страницу вперёд\n` +
            `<:dnexttt:1484292483331526816> — перелистнуть на 3 страницы вперёд`
          ),
          separator(),
          navButtons(callerId, safePage, totalPages),
        ]),
      ];

      await interaction.update({ flags: IS_V2, components });
      return;
    }

    // Giveaway join: giveaway_join_<id>
    if (customId.startsWith('giveaway_join_')) {
      const gId = parseInt(customId.split('_')[2]);
      const gData = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(gId);

      if (!gData || gData.ended) {
        return interaction.reply({ ...v2([container([text('❌ Этот розыгрыш уже завершён.')])], true) });
      }

      const existing = db.prepare('SELECT 1 FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?').get(gId, interaction.user.id);

      if (existing) {
        db.prepare('DELETE FROM giveaway_participants WHERE giveaway_id = ? AND user_id = ?').run(gId, interaction.user.id);
        await interaction.reply({
          ...v2([container([
            text('### Регистрация отменена\n-# Вы вышли из розыгрыша. Нажмите кнопку снова, чтобы участвовать.'),
          ])], true),
        });
      } else {
        db.prepare('INSERT OR IGNORE INTO giveaway_participants (giveaway_id, user_id) VALUES (?, ?)').run(gId, interaction.user.id);
        await interaction.reply({
          ...v2([container([
            text('### Вы успешно зарегистрировались на розыгрыш!!!\n-# Чтобы отменить регистрацию, кликните на кнопку повторно'),
          ])], true),
        });
      }

      // Update button count in the giveaway message
      const count = db.prepare('SELECT COUNT(*) as cnt FROM giveaway_participants WHERE giveaway_id = ?').get(gId);
      const participantCount = count ? Number(count.cnt) : 0;
      const components = buildGiveawayComponents(gData, participantCount);

      await interaction.message.edit({ flags: IS_V2, components }).catch(() => {});
      return;
    }

    // Giveaway members: giveaway_members_<id>
    if (customId.startsWith('giveaway_members_')) {
      const gId = parseInt(customId.split('_')[2]);
      const participants = db.prepare('SELECT user_id FROM giveaway_participants WHERE giveaway_id = ?').all(gId);

      if (!participants.length) {
        return interaction.reply({ ...v2([container([text('*Участников пока нет*')])], true) });
      }

      const lines = participants.map((p, i) => `${i + 1}. <@${p.user_id}>`).join('\n');
      return interaction.reply({
        ...v2([container([
          text(`### Участники розыгрыша (${participants.length})\n${lines}`),
        ])], true),
      });
    }

    // Card reply button: card_reply_<senderId>_<recipientId>
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

    // Moderation buttons: mod_reason_<id>, mod_time_<id>, mod_remove_<id>
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

  // Modal submits
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
