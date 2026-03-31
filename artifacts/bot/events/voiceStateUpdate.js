const { startVoiceSession, endVoiceSession, getOrCreateUser, getMarriage, startVoiceTogether, endVoiceTogether } = require('../database');

const VOICE_ROLES = [
  { hours: 75,  roleId: '1487548190155608267' },
  { hours: 175, roleId: '1487548301703385230' },
  { hours: 250, roleId: '1487548379943670021' },
  { hours: 375, roleId: '1487548449527169144' },
  { hours: 800, roleId: '1487548521409413151' },
];

function getVoiceRole(totalHours) {
  let role = null;
  for (const vr of VOICE_ROLES) {
    if (totalHours >= vr.hours) role = vr.roleId;
  }
  return role;
}

async function checkVoiceRole(member, totalSeconds) {
  const totalHours = totalSeconds / 3600;
  const targetRole = getVoiceRole(totalHours);
  if (!targetRole) return;
  for (const vr of VOICE_ROLES) {
    if (vr.roleId !== targetRole && member.roles.cache.has(vr.roleId)) {
      await member.roles.remove(vr.roleId).catch(() => {});
    }
  }
  if (!member.roles.cache.has(targetRole)) {
    await member.roles.add(targetRole).catch(() => {});
  }
}

async function updateVoiceTogether(guild, userId, newChannelId) {
  const marriage = getMarriage(guild.id, userId);
  if (!marriage) return;

  const partnerId = marriage.user1_id === userId ? marriage.user2_id : marriage.user1_id;
  const partnerMember = guild.members.cache.get(partnerId);
  if (!partnerMember) return;

  const partnerChannelId = partnerMember.voice?.channelId;

  if (newChannelId && partnerChannelId && newChannelId === partnerChannelId) {
    startVoiceTogether(marriage.id);
  } else {
    endVoiceTogether(marriage.id);
  }
}

async function handleVoiceStateUpdate(client, oldState, newState) {
  const userId = newState.id || oldState.id;
  const guildId = (newState.guild || oldState.guild).id;
  const guild = newState.guild || oldState.guild;

  if (!userId || !guildId) return;

  const member = guild.members.cache.get(userId);
  if (!member || member.user.bot) return;

  const joinedChannel = !oldState.channelId && newState.channelId;
  const leftChannel = oldState.channelId && !newState.channelId;
  const switchedChannel = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

  if (joinedChannel) {
    startVoiceSession(userId, guildId);
    await updateVoiceTogether(guild, userId, newState.channelId);
  } else if (leftChannel) {
    const duration = endVoiceSession(userId, guildId);
    const leftMarriage = getMarriage(guildId, userId);
    if (leftMarriage) endVoiceTogether(leftMarriage.id);
    if (duration > 0) {
      const user = getOrCreateUser(userId, guildId);
      await checkVoiceRole(member, Number(user.voice_total));
    }
    await updateVoiceTogether(guild, userId, null);
  } else if (switchedChannel) {
    const duration = endVoiceSession(userId, guildId);
    if (duration > 0) {
      const user = getOrCreateUser(userId, guildId);
      await checkVoiceRole(member, Number(user.voice_total));
    }
    startVoiceSession(userId, guildId);
    await updateVoiceTogether(guild, userId, newState.channelId);
  }
}

module.exports = { handleVoiceStateUpdate };
