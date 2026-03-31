const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const keepAlive = require('./keep-alive');
const { handleMessageCreate } = require('./events/messageCreate');
const { handleMessageDelete } = require('./events/messageDelete');
const { handleMessageUpdate } = require('./events/messageUpdate');
const { handleVoiceStateUpdate } = require('./events/voiceStateUpdate');
const { handleInteraction } = require('./events/interactionCreate');
const { db, startVoiceSession, getMarriage, deleteMarriage } = require('./database');

keepAlive();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['Message', 'Channel', 'Reaction'],
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerSlashCommands();
  startBirthdayChecker();
  startCaseExpiryChecker();
  syncVoiceSessions();
  await resumeGiveaways();
});

client.on('messageCreate', msg => handleMessageCreate(client, msg).catch(console.error));
client.on('messageDelete', msg => handleMessageDelete(client, msg).catch(console.error));
client.on('messageUpdate', (o, n) => handleMessageUpdate(client, o, n).catch(console.error));
client.on('interactionCreate', i => handleInteraction(client, i).catch(console.error));
client.on('voiceStateUpdate', (o, n) => handleVoiceStateUpdate(client, o, n).catch(console.error));

// Auto-divorce when member leaves the server
client.on('guildMemberRemove', async (member) => {
  try {
    const marriage = getMarriage(member.guild.id, member.id);
    if (!marriage) return;

    const partnerId = marriage.user1_id === member.id ? marriage.user2_id : marriage.user1_id;
    deleteMarriage(marriage.id);

    const LOVE_ROLES = ['1488588731874148422','1488588784965648655','1488588845262962799','1488588894055436412','1488588948937900283','1488588997683974225','1488589051081789450'];
    const partnerMember = member.guild.members.cache.get(partnerId);
    if (partnerMember) {
      for (const rId of LOVE_ROLES) {
        await partnerMember.roles.remove(rId).catch(() => {});
      }
    }
  } catch {}
});

async function registerSlashCommands() {
  const commands = require('./commands/index');
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  // Clear global commands to prevent duplicates
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
  } catch {}

  for (const [, guild] of client.guilds.cache) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guild.id),
        { body: commands.map(c => c.data) }
      );
      console.log(`Slash commands registered for guild ${guild.id}`);
    } catch (e) {
      console.error(`Failed to register commands for ${guild.id}:`, e.message);
    }
  }
}

// Resume active giveaways after bot restart
async function resumeGiveaways() {
  const { scheduleGiveaway } = require('./commands/giveaway');
  const active = db.prepare('SELECT * FROM giveaways WHERE ended = 0').all();
  const now = Date.now();
  for (const g of active) {
    const remaining = Number(g.end_time) - now;
    if (remaining <= 0) {
      const { endGiveaway } = require('./commands/giveaway');
      await endGiveaway(client, g.id).catch(() => {});
    } else {
      scheduleGiveaway(client, Number(g.id), remaining);
    }
  }
  console.log(`Resumed ${active.length} active giveaway(s)`);
}

// Sync voice sessions on startup (in case bot was restarted)
function syncVoiceSessions() {
  for (const [, guild] of client.guilds.cache) {
    for (const [, channel] of guild.channels.cache) {
      if (!channel.isVoiceBased()) continue;
      for (const [, member] of channel.members) {
        if (!member.user.bot) startVoiceSession(member.id, guild.id);
      }
    }
  }
}

// Birthday checker
function startBirthdayChecker() {
  const check = async () => {
    const now = new Date();
    const today = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rows = db.prepare("SELECT * FROM users WHERE birthday_date = ?").all(today);

    for (const row of rows) {
      const thisYear = now.getFullYear();
      const awardKey = `${row.user_id}_${thisYear}`;
      if (db.prepare('SELECT 1 FROM birthday_awards WHERE award_key = ?').get(awardKey)) continue;

      const BIRTHDAY_ROLE = '1485770383096545350';
      const BIRTHDAY_CHANNEL = '1403785454595084349';
      const gifts = [
        'XP от ?love увеличен в 2 раза в течении дня',
        'Кастомная роль на месяц',
        'Кастомная роль на 3 месяца',
        'Бесплатная рулетка с монетами (от 500 до 10 000)',
        'Свой личный голосовой канал',
      ];
      const gift = gifts[Math.floor(Math.random() * gifts.length)];

      for (const [, guild] of client.guilds.cache) {
        if (guild.id !== row.guild_id) continue;
        try {
          const member = await guild.members.fetch(row.user_id).catch(() => null);
          if (!member) continue;

          await member.roles.add(BIRTHDAY_ROLE).catch(() => {});

          const ch = guild.channels.cache.get(BIRTHDAY_CHANNEL);
          if (ch) {
            const { container, text, IS_V2 } = require('./utils/components');
            await ch.send({
              content: `<@${row.user_id}>`,
              flags: IS_V2,
              components: [
                container([
                  text(
                    `<@${row.user_id}>, с днём рождения! 🎂\n` +
                    `Желаем всего самого лучшего от всего сервера!\n` +
                    `Бонус от замечательного владельца сервера <@985202067041845258> : ||*${gift}*||`
                  ),
                ]),
              ],
            });
          }

          db.prepare('INSERT OR IGNORE INTO birthday_awards (award_key) VALUES (?)').run(awardKey);

          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          const ms = endOfDay.getTime() - Date.now();
          setTimeout(() => member.roles.remove(BIRTHDAY_ROLE).catch(() => {}), ms);
        } catch {}
      }
    }
  };

  check();
  setInterval(check, 60 * 60 * 1000);
}

// Case expiry checker
function startCaseExpiryChecker() {
  const check = async () => {
    const now = Date.now();
    const expired = db.prepare("SELECT * FROM cases WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= ?").all(now);

    for (const c of expired) {
      try {
        const { PUNISHMENT_ROLE } = require('./utils/hierarchy');
        const { buildDmComponents } = require('./prefix/mute');

        for (const [, guild] of client.guilds.cache) {
          if (guild.id !== c.guild_id) continue;
          if (c.type === 'mute') {
            const member = await guild.members.fetch(c.target_id).catch(() => null);
            if (member) {
              await member.roles.remove(PUNISHMENT_ROLE).catch(() => {});
              await member.timeout(null).catch(() => {});
            }
          }
        }

        db.prepare("UPDATE cases SET status = 'expired' WHERE id = ?").run(c.id);

        if (c.dm_message_id && c.dm_channel_id) {
          const modUser = await client.users.fetch(c.moderator_id).catch(() => null);
          if (modUser) {
            const dmCh = await modUser.createDM().catch(() => null);
            if (dmCh) {
              const dmMsg = await dmCh.messages.fetch(c.dm_message_id).catch(() => null);
              if (dmMsg) {
                const { IS_V2 } = require('./utils/components');
                const mod = { id: c.moderator_id };
                const t = { id: c.target_id };
                const comps = c.type === 'mute'
                  ? buildDmComponents(c.id, mod, t, c.reason, c.duration, c.expires_at, 'Закрыт', true)
                  : require('./prefix/ban').buildBanDmComponents(c.id, mod, t, c.reason, 'Закрыт', true);
                await dmMsg.edit({ flags: IS_V2, components: comps }).catch(() => {});
              }
            }
          }
        }
      } catch {}
    }
  };

  setInterval(check, 30_000);
}

client.login(process.env.DISCORD_TOKEN);
