import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN;

if (!token) {
  console.error("DISCORD_BOT_TOKEN が設定されていません");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// 起動時
client.once("ready", () => {
  console.log(`ログイン完了: ${client.user.tag}`);
});

// メッセージを見て反応するだけの例
client.on("messageCreate", async (message) => {
  // Bot自身・他Botには反応しない
  if (message.author.bot) return;

  // シンプルに「!ping」だけ反応
  if (message.content === "!ping") {
    await message.reply("pong!");
  }
});

client.login(token);
