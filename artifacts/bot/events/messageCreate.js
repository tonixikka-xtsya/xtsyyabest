const { addXp, getOrCreateUser, incrementMessageCount } = require('../database');
const { getLevelFromXp } = require('../utils/xp');

const PREFIX = '?';
const XP_COOLDOWN = 60_000;
const XP_MIN = 10;
const XP_MAX = 25;

const XP_CHANNEL = '1403785454595084349';

const BONUS_ROLE_HALF = '1458850005153742993';
const BONUS_ROLE_FULL_A = '1467228617334587536';
const BONUS_ROLE_FULL_B = '1467063042431778869';

const LEVEL_ROLES = [
  { level: 5,   roleId: '1488582043632795838' },
  { level: 10,  roleId: '1404881427245563904' },
  { level: 20,  roleId: '1404881104758112298' },
  { level: 25,  roleId: '1404880719469350945' },
  { level: 40,  roleId: '1404880308603719711' },
  { level: 50,  roleId: '1404878540775620649' },
  { level: 75,  roleId: '1404878088369606666' },
  { level: 80,  roleId: '1404877963417227346' },
  { level: 85,  roleId: '1404877497924845590' },
  { level: 95,  roleId: '1404877687201333298' },
  { level: 100, roleId: '1404877101378699265' },
];

function getLevelRole(level) {
  let role = null;
  for (const lr of LEVEL_ROLES) {
    if (level >= lr.level) role = lr.roleId;
  }
  return role;
}

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
  '2x': require('../prefix/2x'),
  '2xoff': require('../prefix/2xoff'),
  lb: require('../prefix/lb'),
  marry: require('../prefix/marry'),
  family: require('../prefix/family'),
  divorce: require('../prefix/divorce'),
  son: require('../prefix/son'),
  daughter: require('../prefix/daughter'),
  love: require('../prefix/love'),
  loverank: require('../prefix/loverank'),
  lovelb: require('../prefix/lovelb'),
};

async function handleMessageCreate(client, message) {
  if (message.author.bot || !message.guild) return;

  // Track message count for all messages
  incrementMessageCount(message.author.id, message.guild.id);

  // XP only in designated channel
  if (message.channel.id === XP_CHANNEL) {
    const user = getOrCreateUser(message.author.id, message.guild.id);
    const now = Date.now();

    if (!user.xp_cooldown || now - Number(user.xp_cooldown) >= XP_COOLDOWN) {
      const member = message.member;
      let multiplier = 1.0;
      if (member?.roles.cache.has(BONUS_ROLE_FULL_A) || member?.roles.cache.has(BONUS_ROLE_FULL_B)) {
        multiplier = 2.5;
      } else if (member?.roles.cache.has(BONUS_ROLE_HALF)) {
        multiplier = 1.5;
      }

      const { isDoubleXp } = require('../utils/state');
      if (isDoubleXp()) multiplier *= 2;

      const xpGain = Math.floor((Math.random() * (XP_MAX - XP_MIN + 1) + XP_MIN) * multiplier);
      const beforeLevel = getLevelFromXp(Number(user.xp));
      const updated = addXp(message.author.id, message.guild.id, xpGain);
      const afterLevel = getLevelFromXp(Number(updated.xp));

      if (afterLevel > beforeLevel && member) {
        const newRole = getLevelRole(afterLevel);
        const oldRole = getLevelRole(beforeLevel);
        if (newRole && newRole !== oldRole) {
          if (oldRole) await member.roles.remove(oldRole).catch(() => {});
          await member.roles.add(newRole).catch(() => {});
        }
      }

      require('../database').db.prepare('UPDATE users SET xp_cooldown = ? WHERE user_id = ? AND guild_id = ?').run(now, message.author.id, message.guild.id);
    }
  }

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  if (prefixCommands[cmd]) {
    await prefixCommands[cmd].execute(client, message, args).catch(console.error);
  }
}

module.exports = { handleMessageCreate };
