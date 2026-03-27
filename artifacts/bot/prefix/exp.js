const { container, text, v2 } = require('../utils/components');
const { addXp, getOrCreateUser } = require('../database');
const { getLevelFromXp, num } = require('../utils/xp');

const OWNER_ID = '985202067041845258';

async function execute(client, message, args) {
  if (message.author.id !== OWNER_ID) {
    const r = await message.reply({ ...v2([container([text('❌ Только владелец сервера может использовать эту команду.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const target = message.mentions.members.first();
  if (!target) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите участника. Пример: `?exp @user 500`')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const amount = parseInt(args[1]);
  if (isNaN(amount) || amount === 0) {
    const r = await message.reply({ ...v2([container([text('❌ Укажите количество опыта.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  const updated = addXp(target.id, message.guild.id, amount);
  const newLevel = getLevelFromXp(updated.xp);

  const r = await message.reply({ ...v2([container([text(`✅ <@${target.id}> получил **${num(amount)}** exp.\nВсего exp: **${num(updated.xp)}** | Уровень: **${newLevel}**`)])]) });
  setTimeout(() => r.delete().catch(() => {}), 10000);
}

module.exports = { execute };
