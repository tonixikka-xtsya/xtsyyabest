const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'bot.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    type TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT DEFAULT 'Не указана',
    duration INTEGER,
    expires_at INTEGER,
    created_at INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    dm_message_id TEXT,
    dm_channel_id TEXT,
    log_message_id TEXT,
    log_channel_id TEXT
  );
  CREATE TABLE IF NOT EXISTS rep (
    giver_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    PRIMARY KEY (giver_id, receiver_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    rep_received INTEGER DEFAULT 0,
    voice_total INTEGER DEFAULT 0,
    birthday_date TEXT,
    birthday_set INTEGER DEFAULT 0,
    xp_cooldown INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS voice_sessions (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    join_time INTEGER NOT NULL,
    PRIMARY KEY (user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS voice_daily (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    date TEXT NOT NULL,
    seconds INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, date)
  );
  CREATE TABLE IF NOT EXISTS birthday_awards (
    award_key TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    item TEXT NOT NULL,
    description TEXT NOT NULL,
    organizer_id TEXT NOT NULL,
    organizer_name TEXT NOT NULL,
    winner_count INTEGER DEFAULT 1,
    image_url TEXT,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    ended INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS giveaway_participants (
    giveaway_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (giveaway_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS message_counts (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  );
  CREATE TABLE IF NOT EXISTS marriages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    proposer_id TEXT NOT NULL,
    married_at INTEGER NOT NULL,
    love_xp INTEGER DEFAULT 0,
    love_streak_count INTEGER DEFAULT 0,
    last_love_at INTEGER DEFAULT 0,
    love_streak_day TEXT DEFAULT '',
    voice_together INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marriage_id INTEGER NOT NULL,
    child_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    role TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS voice_together_sessions (
    marriage_id INTEGER NOT NULL PRIMARY KEY,
    start_time INTEGER NOT NULL
  );
`);

// ─── Users ───────────────────────────────────────────────────────────────────
function getOrCreateUser(userId, guildId) {
  db.prepare('INSERT OR IGNORE INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
  return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function addXp(userId, guildId, amount) {
  getOrCreateUser(userId, guildId);
  db.prepare('UPDATE users SET xp = xp + ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
  return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

function setXp(userId, guildId, xp) {
  getOrCreateUser(userId, guildId);
  db.prepare('UPDATE users SET xp = ? WHERE user_id = ? AND guild_id = ?').run(xp, userId, guildId);
  return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
}

// ─── Cases ───────────────────────────────────────────────────────────────────
function createCase(data) {
  const result = db.prepare(`
    INSERT INTO cases (guild_id, type, moderator_id, target_id, reason, duration, expires_at, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(data.guild_id, data.type, data.moderator_id, data.target_id, data.reason, data.duration ?? null, data.expires_at ?? null, data.created_at);
  return Number(result.lastInsertRowid);
}

function getCase(id) {
  return db.prepare('SELECT * FROM cases WHERE id = ?').get(id) ?? null;
}

function getCaseByTarget(guildId, targetId, type) {
  return db.prepare("SELECT * FROM cases WHERE guild_id = ? AND target_id = ? AND type = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(guildId, targetId, type) ?? null;
}

function updateCase(id, data) {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE cases SET ${sets} WHERE id = ?`).run(...Object.values(data), id);
}

// ─── Rep ─────────────────────────────────────────────────────────────────────
function hasGivenRep(giverId, receiverId, guildId) {
  return !!db.prepare('SELECT 1 FROM rep WHERE giver_id = ? AND receiver_id = ? AND guild_id = ?').get(giverId, receiverId, guildId);
}

function addRep(giverId, receiverId, guildId) {
  db.prepare('INSERT OR IGNORE INTO rep (giver_id, receiver_id, guild_id) VALUES (?, ?, ?)').run(giverId, receiverId, guildId);
  getOrCreateUser(receiverId, guildId);
  db.prepare('UPDATE users SET rep_received = rep_received + 1 WHERE user_id = ? AND guild_id = ?').run(receiverId, guildId);
}

// ─── Voice Sessions ───────────────────────────────────────────────────────────
function startVoiceSession(userId, guildId) {
  db.prepare('INSERT OR REPLACE INTO voice_sessions (user_id, guild_id, join_time) VALUES (?, ?, ?)').run(userId, guildId, Date.now());
}

function endVoiceSession(userId, guildId) {
  const session = db.prepare('SELECT * FROM voice_sessions WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!session) return 0;
  const duration = Math.floor((Date.now() - Number(session.join_time)) / 1000);
  if (duration <= 0) {
    db.prepare('DELETE FROM voice_sessions WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
    return 0;
  }
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO voice_daily (user_id, guild_id, date, seconds) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, guild_id, date) DO UPDATE SET seconds = seconds + ?
  `).run(userId, guildId, today, duration, duration);
  getOrCreateUser(userId, guildId);
  db.prepare('UPDATE users SET voice_total = voice_total + ? WHERE user_id = ? AND guild_id = ?').run(duration, userId, guildId);
  db.prepare('DELETE FROM voice_sessions WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  return duration;
}

function getVoiceForDate(userId, guildId, date) {
  const row = db.prepare('SELECT seconds FROM voice_daily WHERE user_id = ? AND guild_id = ? AND date = ?').get(userId, guildId, date);
  return row ? Number(row.seconds) : 0;
}

function getVoiceSince(userId, guildId, dateStr) {
  const row = db.prepare('SELECT SUM(seconds) as total FROM voice_daily WHERE user_id = ? AND guild_id = ? AND date >= ?').get(userId, guildId, dateStr);
  return row?.total ? Number(row.total) : 0;
}

// ─── Message Counts ───────────────────────────────────────────────────────────
function incrementMessageCount(userId, guildId) {
  db.prepare('INSERT INTO message_counts (user_id, guild_id, count) VALUES (?, ?, 1) ON CONFLICT(user_id, guild_id) DO UPDATE SET count = count + 1').run(userId, guildId);
}

function getMessageLeaderboard(guildId) {
  return db.prepare('SELECT * FROM message_counts WHERE guild_id = ? ORDER BY count DESC').all(guildId);
}

// ─── Marriages ───────────────────────────────────────────────────────────────
function getMarriage(guildId, userId) {
  return db.prepare('SELECT * FROM marriages WHERE guild_id = ? AND (user1_id = ? OR user2_id = ?)').get(guildId, userId, userId) ?? null;
}

function createMarriage(data) {
  const result = db.prepare(`
    INSERT INTO marriages (guild_id, user1_id, user2_id, proposer_id, married_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.guild_id, data.user1_id, data.user2_id, data.proposer_id, data.married_at);
  return Number(result.lastInsertRowid);
}

function updateMarriage(id, data) {
  const keys = Object.keys(data);
  if (!keys.length) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE marriages SET ${sets} WHERE id = ?`).run(...Object.values(data), id);
}

function deleteMarriage(id) {
  db.prepare('DELETE FROM children WHERE marriage_id = ?').run(id);
  db.prepare('DELETE FROM voice_together_sessions WHERE marriage_id = ?').run(id);
  db.prepare('DELETE FROM marriages WHERE id = ?').run(id);
}

function getChildren(marriageId) {
  return db.prepare('SELECT * FROM children WHERE marriage_id = ?').all(marriageId);
}

function addChild(marriageId, childId, guildId, role) {
  db.prepare('INSERT INTO children (marriage_id, child_id, guild_id, role) VALUES (?, ?, ?, ?)').run(marriageId, childId, guildId, role);
}

function isAlreadyChild(childId, guildId) {
  return !!db.prepare('SELECT 1 FROM children WHERE child_id = ? AND guild_id = ?').get(childId, guildId);
}

// ─── Voice Together ───────────────────────────────────────────────────────────
function startVoiceTogether(marriageId) {
  db.prepare('INSERT OR REPLACE INTO voice_together_sessions (marriage_id, start_time) VALUES (?, ?)').run(marriageId, Date.now());
}

function endVoiceTogether(marriageId) {
  const session = db.prepare('SELECT * FROM voice_together_sessions WHERE marriage_id = ?').get(marriageId);
  if (!session) return 0;
  const duration = Math.floor((Date.now() - Number(session.start_time)) / 1000);
  db.prepare('DELETE FROM voice_together_sessions WHERE marriage_id = ?').run(marriageId);
  if (duration <= 0) return 0;
  db.prepare('UPDATE marriages SET voice_together = voice_together + ? WHERE id = ?').run(duration, marriageId);
  return duration;
}

module.exports = {
  db,
  getOrCreateUser, addXp, setXp,
  createCase, getCase, getCaseByTarget, updateCase,
  hasGivenRep, addRep,
  startVoiceSession, endVoiceSession, getVoiceForDate, getVoiceSince,
  incrementMessageCount, getMessageLeaderboard,
  getMarriage, createMarriage, updateMarriage, deleteMarriage,
  getChildren, addChild, isAlreadyChild,
  startVoiceTogether, endVoiceTogether,
};
