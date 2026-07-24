node limpar.js

const { REST, Routes } = require('discord.js');
require('dotenv').config();

const rest = new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.1529306624383254558,
        "1486024582535319804"
      ),
      { body: [] }
    );

    console.log("✅ Comandos do servidor removidos!");
  } catch (error) {
    console.error(error);
  }
})();