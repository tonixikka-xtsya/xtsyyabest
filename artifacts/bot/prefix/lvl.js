const { container, text, v2 } = require('../utils/components');
const { getOrCreateUser, setXp } = require('../database');
const { getLevelFromXp, totalXpToReach, num } = require('../utils/xp');

const OWNER_ID = '985202067041845258';

async function execute(client, message, args) {
  if (message.author.id !== OWNER_ID) {
    const r = await message.reply({ ...v2([container([text('❌ Только владелец сервера может использовать эту команду.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const target = message.mentions.members.first();
  if (!target) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите участника. Пример: `?lvl @user +5` или `?lvl @user -3`')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const deltaStr = args[1];
  if (!deltaStr || !/^[+-]?\d+$/.test(deltaStr)) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите количество уровней. Пример: `?lvl @user +5` или `?lvl @user -3`')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const delta = parseInt(deltaStr);
  const user = getOrCreateUser(target.id, message.guild.id);
  const currentLevel = getLevelFromXp(user.xp);
  const newLevel = Math.max(0, currentLevel + delta);
  const newXp = totalXpToReach(newLevel);

  setXp(target.id, message.guild.id, newXp);

  const sign = delta >= 0 ? `+${delta}` : `${delta}`;
  const r = await message.reply({ ...v2([container([text(`✅ <@${target.id}>: уровень изменён (${sign})\n**${currentLevel}** → **${newLevel}** уровень`)])]) });
  setTimeout(() => r.delete().catch(() => {}), 10000);
}

module.exports = { execute };
