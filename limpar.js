const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        "ID_DO_SEU_SERVIDOR"
      ),
      { body: [] }
    );

    console.log("✅ Comandos do servidor removidos!");
  } catch (error) {
    console.error(error);
  }
})();