const { container, text, v2, IS_V2 } = require('../utils/components');
const { setDoubleXp } = require('../utils/state');

const OWNER_ID = '985202067041845258';

async function execute(client, message, args) {
  if (message.author.id !== OWNER_ID) {
    const r = await message.reply({ ...v2([container([text('❌ Только владелец сервера может использовать эту команду.')])]) });
    setTimeout(() => r.delete().catch(() => {}), 10000);
    return;
  }

  setDoubleXp(true);

  await message.channel.send({
    flags: IS_V2,
    components: [
      container([
        text('## 2X ЕВЕНТ ОПЫТА СТАРТАНУЛ @here'),
      ]),
    ],
  });
}

module.exports = { execute };
