/**
 * index.js — Remener Discord Bot
 *
 * Entry point that wires together:
 *   • The Discord client (discord.js v14)
 *   • The 24/7 voice channel monitor  (./voice.js)
 *   • The GitHub webhook receiver      (./webhook.js)
 *
 * All configuration is read from a .env file — see .env.example.
 */

// ── Load environment variables first ──────────────────────────────────────────
require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoice, handleVoiceStateUpdate } = require("./voice");
const { startWebhookServer } = require("./webhook");

// ── Validate critical env vars early ──────────────────────────────────────────
const REQUIRED_ENV = ["DISCORD_TOKEN", "GUILD_ID"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `[Boot] Missing required environment variable(s): ${missing.join(", ")}\n` +
      "       Copy .env.example to .env and fill in the values."
  );
  process.exit(1);
}

// ── Create Discord client with the intents we need ────────────────────────────
//
// GuildVoiceStates  — required for voiceStateUpdate events and joining VC.
// Guilds            — required for guild/channel cache resolution.
// GuildMembers      — required for member display names in notifications.
//
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

// ── Ready event ───────────────────────────────────────────────────────────────
client.once("ready", () => {
  console.log("──────────────────────────────────────────");
  console.log(`  ✅  Logged in as ${client.user.tag}`);
  console.log(`  📡  Serving ${client.guilds.cache.size} guild(s)`);
  console.log("──────────────────────────────────────────");

  // 1. Join the monitored voice channel.
  joinVoice(client);

  // 2. Start the Express webhook server.
  startWebhookServer(client);
});

// ── Voice state tracking ──────────────────────────────────────────────────────
client.on("voiceStateUpdate", (oldState, newState) => {
  handleVoiceStateUpdate(oldState, newState, client);
});

// ── Global error handlers ─────────────────────────────────────────────────────
// Prevent the process from crashing on unhandled promise rejections or
// uncaught exceptions — log them instead so the bot stays alive.

process.on("unhandledRejection", (reason) => {
  console.error("[Fatal] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Fatal] Uncaught exception:", err);
  // Optionally exit here if the error is truly unrecoverable:
  // process.exit(1);
});

// ── Login ─────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("[Boot] Failed to log in:", err.message);
  process.exit(1);
});
