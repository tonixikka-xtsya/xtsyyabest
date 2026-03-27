const { container, text, v2 } = require('../utils/components');
const { getOrCreateUser, db } = require('../database');

const data = {
  name: 'birthday',
  description: 'Установить дату своего дня рождения (только один раз)',
  options: [
    { type: 3, name: 'дата', description: 'Дата в формате ДД.ММ (например 25.03)', required: true },
  ],
};

async function execute(client, interaction) {
  const dateStr = interaction.options.getString('дата');

  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (!match) {
    return interaction.reply({
      ...v2([container([text('❌ Неверный формат. Используйте ДД.ММ (например `25.03`)')])], true),
    });
  }

  const day = parseInt(match[1]);
  const month = parseInt(match[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return interaction.reply({
      ...v2([container([text('❌ Неверная дата.')])], true),
    });
  }

  const user = getOrCreateUser(interaction.user.id, interaction.guildId);
  if (user.birthday_set) {
    return interaction.reply({
      ...v2([container([text(`❌ Вы уже установили дату дня рождения: \`${user.birthday_date}\`. Её нельзя изменить.`)])], true),
    });
  }

  const formatted = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
  db.prepare('UPDATE users SET birthday_date = ?, birthday_set = 1 WHERE user_id = ? AND guild_id = ?')
    .run(formatted, interaction.user.id, interaction.guildId);

  await interaction.reply({
    ...v2([container([text(`🎂 Дата дня рождения установлена: **${formatted}**\nВ этот день вы получите роль и сюрприз от сервера!`)])], true),
  });
}

module.exports = { data, execute };
