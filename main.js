const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
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

// Schema do usuário
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  messages: { type: Number, default: 0 },

  // Economia Dizzles 🪙
  dizzles: { type: Number, default: 0 },
  lastDizzleTime: { type: Number, default: 0 },

  // Cooldown do XP
  lastMessageTime: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

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

// Calcular XP necessário para um nível
function getXpForLevel(level) {
  const baseXp = config.xp.baseXpPerLevel;
  const multiplier = config.xp.levelMultiplier;
  
  let totalXp = 0;
  for (let i = 1; i < level; i++) {
    totalXp += Math.floor(baseXp * Math.pow(multiplier, i - 1));
  }
  return totalXp;
}

// Obter stats do usuário
async function getUserStats(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({
      userId,
      xp: 0,
      level: 1,
      messages: 0,
      lastMessageTime: 0,
    });
  }
  return user;
}

// Adicionar XP
async function addXp(userId, amount) {
  const user = await getUserStats(userId);
  user.xp += amount;

  // Calcular novo nível
  let newLevel = 1;
  while (user.xp >= getXpForLevel(newLevel + 1)) {
    newLevel++;
  }

  const leveledUp = newLevel > user.level;
  user.level = newLevel;

  await user.save();
  return { leveledUp, newLevel };
}

// Obter posição no leaderboard
async function getRankPosition(userId) {
  const usersAbove = await User.countDocuments({ xp: { $gt: (await getUserStats(userId)).xp } });
  return usersAbove + 1;
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
client.on('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  
  // Conectar ao MongoDB
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
  }
});

// Event: Mensagem recebida
client.on('messageCreate', async (message) => {
  // Ignorar mensagens do bot e mensagens privadas
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const stats = await getUserStats(userId);
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

  const result = await addXp(userId, xpGained);
  stats.messages += 1;
  stats.lastMessageTime = now;
  await stats.save();

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
      const stats = await getUserStats(targetUser.id);
      const rank = await getRankPosition(targetUser.id);

      const currentLevelXp = getXpForLevel(stats.level);
      const nextLevelXp = getXpForLevel(stats.level + 1);
      const xpProgress = stats.xp - currentLevelXp;
      const xpNeeded = nextLevelXp - currentLevelXp;
      const xpRemaining = xpNeeded - xpProgress;
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
                name: 'Posição',
                value: `#${rank}`,
                inline: true,
              },
              {
                name: 'Nível',
                value: `${stats.level}`,
                inline: true,
              },
              {
                name: 'Mensagens',
                value: `${stats.messages}`,
                inline: true,
              },
              {
                name: 'XP Total',
                value: `${stats.xp}`,
                inline: false,
              },
              {
                name: 'Progresso',
                value: `${createProgressBar(xpProgress, xpNeeded)} ${percentage}%\n${xpProgress}/${xpNeeded} XP`,
                inline: false,
              },
              {
                name: 'XP Faltando',
                value: `${xpRemaining} XP pro próximo nível`,
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

      const result = await addXp(targetUser.id, xpAmount);
      message.reply({
        content: `✅ ${xpAmount} XP adicionado para **${targetUser.username}**! Nível atual: **${result.newLevel}**`,
        ephemeral: false,
      });
    }

    // Comando: !leaderboard
    if (command === 'leaderboard' || command === 'top') {
      const users = await User.find().sort({ xp: -1 }).limit(10);

      const leaderboardText = await Promise.all(
        users.map(async (stats, index) => {
          try {
            const user = await client.users.fetch(stats.userId);
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
