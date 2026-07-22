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

// Mensagens de level up variadas
const levelUpMessages = [
  '{user} atingiu o nível {level}, parabéns!',
  'Temam todos, {user} acaba de atingir o nível {level}.',
  'O nível {level} parecia ser inalcançável, porém {user} provou o contrário.',
  '{user} falou algo e sem querer atingiu o nível {level}!',
  'O nível {level} combina com {user}.',
  '{user} atingiu o nível {level}!!! Corram para as colinas!!!',
  '{user} chegou ao nível {level}, nada mal!',
  '{user} caiu no chão e atingiu o nível {level} aprendendo com os próprios erros!',
  'Eu jurava que o mundo estava acabando, mas quando vi, era só o {user} atingindo o nível {level}',
];

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

// Criar barra de progresso
function createProgressBar(current, max, size = 10) {
  const percentage = current / max;
  const filled = Math.round(percentage * size);
  const empty = size - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// Pegar mensagem de level up aleatória
function getRandomLevelUpMessage(username, level) {
  const randomMessage = levelUpMessages[Math.floor(Math.random() * levelUpMessages.length)];
  return randomMessage
    .replace('{user}', `**${username}**`)
    .replace('{level}', `**${level}**`);
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
    const levelUpMessage = getRandomLevelUpMessage(message.author.username, result.newLevel);
    message.reply({
      content: levelUpMessage,
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

    // Comando: !pf (profile)
    if (command === 'pf') {
      const targetUser = message.mentions.users.first() || message.author;
      const stats = getUserStats(targetUser.id);

      const xpPerLevel = config.xp.xpPerLevel;
      const currentLevelXp = (stats.level - 1) * xpPerLevel;
      const nextLevelXp = stats.level * xpPerLevel;
      const xpProgress = stats.xp - currentLevelXp;
      const xpNeeded = nextLevelXp - currentLevelXp;
      const percentage = Math.round((xpProgress / xpNeeded) * 100);

      message.reply({
        embeds: [
          {
            color: 0x5865f2,
            author: {
              name: targetUser.username,
              icon_url: targetUser.displayAvatarURL(),
            },
            thumbnail: {
              url: targetUser.displayAvatarURL(),
            },
            fields: [
              {
                name: 'Nível',
                value: `${stats.level}`,
                inline: true,
              },
              {
                name: 'XP Total',
                value: `${stats.xp}`,
                inline: true,
              },
              {
                name: ' ',
                value: ' ',
                inline: false,
              },
              {
                name: 'Progresso',
                value: `${createProgressBar(xpProgress, xpNeeded)} ${percentage}%\n${xpProgress}/${xpNeeded} XP`,
                inline: false,
              },
            ],
          },
        ],
      });
    }

    // Comando: !addxp (SOMENTE DONO)
    if (command === 'addxp') {
      if (message.author.id !== process.env.OWNER_ID) {
        message.reply({
          content: '❌ Você não tem permissão para usar este comando!',
          ephemeral: true,
        });
        return;
      }

      const targetUser = message.mentions.users.first();
      const xpAmount = parseInt(args[1]);

      if (!targetUser || isNaN(xpAmount)) {
        message.reply({
          content: '❌ Uso: `!addxp @usuário <quantidade>`',
          ephemeral: true,
        });
        return;
      }

      const result = addXp(targetUser.id, xpAmount);
      message.reply({
        content: `✅ ${xpAmount} XP adicionado para **${targetUser.username}**! Nível atual: **${result.newLevel}**`,
        ephemeral: false,
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
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return `${medal} **${user.username}** — Nível ${stats.level} • ${stats.xp} XP`;
          } catch {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return `${medal} **Unknown User** — Nível ${stats.level} • ${stats.xp} XP`;
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
              text: 'Use !pf para ver seus stats!',
            },
          },
        ],
      });
    }
  }
});

// Conectar ao Discord
client.login(process.env.DISCORD_TOKEN);
