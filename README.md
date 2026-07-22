# 🎵 Dizzy - Discord Bot

Um bot Discord com sistema de XP e níveis!

## ✨ Funcionalidades

- ⭐ **Sistema de XP** - Ganhe XP ao enviar mensagens
- 📈 **Níveis** - Suba de nível conforme ganha XP
- 🏆 **Leaderboard** - Veja os top players
- 📊 **Estatísticas** - Confira seu nível e XP total

## 🚀 Como usar

### 1. Pré-requisitos
- Node.js 16.9.0 ou superior
- Um servidor Discord
- Um bot registrado no Discord Developer Portal

### 2. Instalação

\`\`\`bash
git clone https://github.com/legendaryberdet-byte/Dizzy.git
cd Dizzy
npm install
\`\`\`

### 3. Configuração

1. Renomeie \`.env.example\` para \`.env\`
2. Adicione seu token do bot:
   \`\`\`
   DISCORD_TOKEN=seu_token_aqui
   CLIENT_ID=seu_client_id_aqui
   GUILD_ID=seu_guild_id_aqui
   \`\`\`

### 4. Executar

\`\`\`bash
npm start
\`\`\`

## 📝 Comandos

| Comando | Descrição |
|---------|-----------|
| \`!level [@user]\` | Ver seu nível e XP (ou de outro usuário) |
| \`!xp [@user]\` | Atalho para !level |
| \`!leaderboard\` | Ver top 10 usuários |
| \`!top\` | Atalho para !leaderboard |

## ⚙️ Configurações

Edite \`config.json\` para ajustar:

\`\`\`json
{
  "xp": {
    "minXpPerMessage": 5,        // XP mínimo por mensagem
    "maxXpPerMessage": 15,       // XP máximo por mensagem
    "xpPerLevel": 100,           // XP necessário para subir de nível
    "cooldownSeconds": 10        // Cooldown entre mensagens com XP
  },
  "prefix": "!"                  // Prefixo dos comandos
}
\`\`\`

## 📚 Estrutura de Pastas

\`\`\`
Dizzy/
├── main.js           # Arquivo principal
├── config.json       # Configurações
├── package.json      # Dependências
├── .env.example      # Template de variáveis de ambiente
├── .gitignore        # Arquivos a ignorar no Git
├── README.md         # Este arquivo
└── data/             # Dados salvos (criado automaticamente)
    └── users.json    # Stats dos usuários
\`\`\`

## 🛠️ Tecnologias

- [Discord.js](https://discord.js.org/) - Biblioteca para Discord
- [Node.js](https://nodejs.org/) - Runtime JavaScript

## 📄 Licença

MIT

---

**Próximas features:**
- [ ] Sistema de economia (moedas)
- [ ] Comandos de administração
- [ ] Banco de dados (SQLite/MongoDB)
- [ ] Reações personalizadas
- [ ] E muito mais! 🚀
