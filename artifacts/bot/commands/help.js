const { container, text, separator, v2 } = require('../utils/components');

const data = {
  name: 'help',
  description: 'Список всех команд бота',
};

async function execute(client, interaction) {
  const helpText =
    `## 📋 Список команд\n\n` +
    `**Модерация** *(префикс \`?\`)*\n` +
    `\`?mute @user [время] [причина]\` — замутить участника\n` +
    `\`?unmute @user / #номер_кейса\` — снять мут\n` +
    `\`?ban @user [причина]\` — забанить участника\n` +
    `\`?unban @user / #номер_кейса\` — разбанить\n` +
    `\`?clear [кол-во/@user] [время]\` — очистить сообщения\n\n` +
    `**Активность**\n` +
    `\`?rank [@user]\` — профиль и уровень\n` +
    `\`?rep @user\` — выдать респект\n\n` +
    `**Прочее**\n` +
    `\`/открытка\` — отправить открытку\n` +
    `\`/birthday дата\` — установить день рождения\n\n` +
    `**Только <@985202067041845258>**\n` +
    `\`?exp @user [кол-во]\` — выдать опыт\n` +
    `\`?lvl @user [+/-кол-во]\` — изменить уровень`;

  await interaction.reply({
    ...v2([container([text(helpText)])], true),
  });
}

module.exports = { data, execute };
