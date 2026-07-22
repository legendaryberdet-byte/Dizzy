const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// Carregar configurações
const config = require('./config.json');

// Armazenar usuários e XP (em memória para agora, depois pode ser um banco de dados)
const userStats = new Map();

// Carregar dados salvos
function loadUserStats() {
  if (fs.existsSync('./data/users.json')) {
    const data = fs.readFileSync('./data/users.json', 'utf-8');
    const parsed = JSON.parse(data);
    Object.entries(parsed).forEach(([key, value]) => {
      userStats.set(key, value);
    });
  }
}

// Salvar dados
function saveUserStats() {
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
  }
  const data = Object.fromEntries(userStats);
  fs.writeFileSync('./data/users.json', JSON.stringify(data, null, 2));
}

// Obter stats do usuário
function getUserStats(userId) {
  if (!userStats.has(userId)) {
    userStats.set(userId, {
      xp: 0,
      level: 1,
      lastMessageTime: 0,
    });
  }
  return userStats.get(userId);
}

// Adicionar XP
function addXp(userId, amount) {
  const stats = getUserStats(userId);
  stats.xp += amount;

  // Calcular novo nível
  const xpPerLevel = config.xp.xpPerLevel;
  const newLevel = Math.floor(stats.xp / xpPerLevel) + 1;

  const leveledUp = newLevel > stats.level;
  stats.level = newLevel;

  saveUserStats();
  return { leveledUp, newLevel };
}

// Event: Bot conectado
client.on('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  loadUserStats();
});

// Event: Mensagem recebida
client.on('messageCreate', async (message) => {
  // Ignorar mensagens do bot e mensagens privadas
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const stats = getUserStats(userId);
  const now = Date.now();

  // Verificar cooldown
  if (now - stats.lastMessageTime < config.xp.cooldownSeconds * 1000) {
    return;
  }

  // Gerar XP aleatório
  const xpGained = Math.floor(
    Math.random() * (config.xp.maxXpPerMessage - config.xp.minXpPerMessage + 1) +
      config.xp.minXpPerMessage
  );

  const result = addXp(userId, xpGained);
  stats.lastMessageTime = now;

  // Se subiu de nível, enviar mensagem
  if (result.leveledUp) {
    message.reply({
      content: `🎉 **${message.author.username}** subiu para o **nível ${result.newLevel}**! Parabéns!`,
      ephemeral: false,
    });
  }
});

// Comando: Ver XP/Level (prefix command)
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  if (message.content.startsWith(config.prefix)) {
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args[0].toLowerCase();

    // Comando: !level
    if (command === 'level' || command === 'xp') {
      const targetUser = message.mentions.users.first() || message.author;
      const stats = getUserStats(targetUser.id);

      const xpPerLevel = config.xp.xpPerLevel;
      const currentLevelXp = (stats.level - 1) * xpPerLevel;
      const nextLevelXp = stats.level * xpPerLevel;
      const xpProgress = stats.xp - currentLevelXp;
      const xpNeeded = nextLevelXp - currentLevelXp;

      message.reply({
        embeds: [
          {
            color: 0x5865f2,
            title: `📊 Estatísticas de ${targetUser.username}`,
            fields: [
              {
                name: '📈 Nível',
                value: `${stats.level}`,
                inline: true,
              },
              {
                name: '⭐ XP Total',
                value: `${stats.xp}`,
                inline: true,
              },
              {
                name: '🎯 Progresso',
                value: `${xpProgress}/${xpNeeded}`,
                inline: true,
              },
            ],
            footer: {
              text: 'Continue enviando mensagens para ganhar XP!',
            },
          },
        ],
      });
    }

    // Comando: !leaderboard
    if (command === 'leaderboard' || command === 'top') {
      const sorted = Array.from(userStats.entries())
        .sort((a, b) => b[1].xp - a[1].xp)
        .slice(0, 10);

      const leaderboardText = await Promise.all(
        sorted.map(async ([userId, stats], index) => {
          try {
            const user = await client.users.fetch(userId);
            return `${index + 1}. **${user.username}** - Nível ${stats.level} (${stats.xp} XP)`;
          } catch {
            return `${index + 1}. **Unknown User** - Nível ${stats.level} (${stats.xp} XP)`;
          }
        })
      );

      message.reply({
        embeds: [
          {
            color: 0xffd700,
            title: '🏆 Leaderboard de XP',
            description: leaderboardText.join('\n'),
            footer: {
              text: 'Use !level para ver seus stats!',
            },
          },
        ],
      });
    }
  }
});

// Conectar ao Discord
client.login(process.env.DISCORD_TOKEN);
