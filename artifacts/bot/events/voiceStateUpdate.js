const { startVoiceSession, endVoiceSession } = require('../database');

async function handleVoiceStateUpdate(client, oldState, newState) {
  const userId = newState.id;
  const guildId = newState.guild.id;

  const joinedChannel = !oldState.channelId && newState.channelId;
  const leftChannel = oldState.channelId && !newState.channelId;
  const switchedChannel = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

  if (joinedChannel) {
    startVoiceSession(userId, guildId);
  } else if (leftChannel) {
    endVoiceSession(userId, guildId);
  } else if (switchedChannel) {
    endVoiceSession(userId, guildId);
    startVoiceSession(userId, guildId);
  }
}

module.exports = { handleVoiceStateUpdate };
