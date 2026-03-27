const { addXp, getOrCreateUser } = require('../database');
const { getLevelFromXp } = require('../utils/xp');

const PREFIX = '?';
const XP_COOLDOWN = 60_000;
const XP_MIN = 10;
const XP_MAX = 25;

const BONUS_ROLE_HALF = '1458850005153742993';
const BONUS_ROLE_FULL_A = '1467228617334587536';
const BONUS_ROLE_FULL_B = '1467063042431778869';

const prefixCommands = {
  mute: require('../prefix/mute'),
  unmute: require('../prefix/unmute'),
  ban: require('../prefix/ban'),
  unban: require('../prefix/unban'),
  clear: require('../prefix/clear'),
  rep: require('../prefix/rep'),
  rank: require('../prefix/rank'),
  exp: require('../prefix/exp'),
  lvl: require('../prefix/lvl'),
};

async function handleMessageCreate(client, message) {
  if (message.author.bot || !message.guild) return;

  // XP from messages
  const user = getOrCreateUser(message.author.id, message.guild.id);
  const now = Date.now();

  if (!user.xp_cooldown || now - user.xp_cooldown >= XP_COOLDOWN) {
    const member = message.member;
    let multiplier = 1.0;
    if (member?.roles.cache.has(BONUS_ROLE_FULL_A) || member?.roles.cache.has(BONUS_ROLE_FULL_B)) {
      multiplier = 2.5;
    } else if (member?.roles.cache.has(BONUS_ROLE_HALF)) {
      multiplier = 1.5;
    }

    const xpGain = Math.floor((Math.random() * (XP_MAX - XP_MIN + 1) + XP_MIN) * multiplier);
    const beforeLevel = getLevelFromXp(user.xp);
    const updated = addXp(message.author.id, message.guild.id, xpGain);
    const afterLevel = getLevelFromXp(updated.xp);

    if (afterLevel > beforeLevel) {
      const { container, text, IS_V2 } = require('../utils/components');
      await message.channel.send({
        content: `<@${message.author.id}>`,
        flags: IS_V2,
        components: [container([text(`🎉 Поздравляем! Вы достигли **${afterLevel}** уровня!`)])],
      }).catch(() => {});
    }

    require('../database').db.prepare('UPDATE users SET xp_cooldown = ? WHERE user_id = ? AND guild_id = ?').run(now, message.author.id, message.guild.id);
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  if (prefixCommands[cmd]) {
    await prefixCommands[cmd].execute(client, message, args).catch(console.error);
  }
}

module.exports = { handleMessageCreate };
