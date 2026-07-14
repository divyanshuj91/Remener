require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoice, handleVoiceStateUpdate } = require("./voice");
const { startWebhookServer } = require("./webhook");
const { handleInteraction } = require("./interactions");

const REQUIRED_ENV = ["DISCORD_TOKEN", "GUILD_ID"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[Boot] Missing: ${missing.join(", ")} — fill in your .env file.`);
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("ready", () => {
  console.log("──────────────────────────────────────────");
  console.log(`  ✅  Logged in as ${client.user.tag}`);
  console.log(`  📡  Serving ${client.guilds.cache.size} guild(s)`);
  console.log("──────────────────────────────────────────");

  joinVoice(client);
  startWebhookServer(client);
});

client.on("voiceStateUpdate", (oldState, newState) => {
  handleVoiceStateUpdate(oldState, newState, client);
});

client.on("interactionCreate", (interaction) => {
  handleInteraction(interaction).catch((err) => {
    console.error("[Interaction] Error:", err.message);
  });
});

process.on("unhandledRejection", (reason) => {
  console.error("[Fatal] Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Fatal] Uncaught exception:", err);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("[Boot] Failed to log in:", err.message);
  process.exit(1);
});
