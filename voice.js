/**
 * voice.js — 24/7 Voice Channel Monitor & Ping System
 *
 * Responsibilities:
 *  1. Join the target voice channel on bot startup (self-deafened).
 *  2. Listen for voiceStateUpdate events.
 *  3. Notify a text channel (with user pings) whenever a human joins
 *     the monitored voice channel.
 *  4. Automatically reconnect if disconnected.
 */

const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");

// ─── State ────────────────────────────────────────────────────────────────────
/** @type {import("@discordjs/voice").VoiceConnection | null} */
let connection = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse the comma-separated USERS_TO_PING env var into an array of
 * Discord mention strings like ["<@111>", "<@222>"].
 */
function buildMentionList() {
  const raw = process.env.USERS_TO_PING || "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => `<@${id}>`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Join the configured voice channel and set up automatic reconnection.
 *
 * @param {import("discord.js").Client} client  — The logged-in Discord client.
 */
function joinVoice(client) {
  const guildId = process.env.GUILD_ID;
  const channelId = process.env.VOICE_CHANNEL_ID;

  if (!guildId || !channelId) {
    console.error(
      "[Voice] GUILD_ID or VOICE_CHANNEL_ID is missing from .env — skipping voice join."
    );
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error(`[Voice] Guild ${guildId} is not in the bot's cache.`);
    return;
  }

  // Create (or recreate) the voice connection.
  connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true, // save bandwidth — we don't need to hear anything
    selfMute: true,
  });

  // ── Reconnection logic ──────────────────────────────────────────────────
  // If the connection enters the "Disconnected" state we attempt to reconnect.
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      // Wait up to 5 seconds for the connection to recover by itself
      // (e.g. during a Discord region change).
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
      // Connection is recovering — do nothing.
    } catch {
      // Not recovering — destroy and rejoin.
      console.warn("[Voice] Connection lost. Attempting to rejoin…");
      connection.destroy();
      joinVoice(client);
    }
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log(`[Voice] Connected to voice channel ${channelId}.`);
  });

  connection.on("error", (err) => {
    console.error("[Voice] Connection error:", err.message);
  });
}

/**
 * Handle the `voiceStateUpdate` event.
 *
 * We care about exactly one transition:
 *   user was NOT in the target channel  →  user IS NOW in the target channel
 *
 * This covers both:
 *   • Joining from no voice channel at all  (oldState.channelId === null)
 *   • Moving from a different voice channel (oldState.channelId !== targetId)
 *
 * @param {import("discord.js").VoiceState} oldState
 * @param {import("discord.js").VoiceState} newState
 * @param {import("discord.js").Client}     client
 */
async function handleVoiceStateUpdate(oldState, newState, client) {
  const targetChannelId = process.env.VOICE_CHANNEL_ID;
  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;

  if (!targetChannelId || !notificationChannelId) return;

  // ── Guard: ignore bots (including ourselves) ────────────────────────────
  if (newState.member?.user.bot) return;

  // ── Detect the "joined target channel" transition ───────────────────────
  const wasInTarget = oldState.channelId === targetChannelId;
  const isInTarget = newState.channelId === targetChannelId;

  // We only care when someone was NOT in the target and now IS.
  if (wasInTarget || !isInTarget) return;

  // ── Build and send the notification ─────────────────────────────────────
  const joiner = newState.member;
  const mentions = buildMentionList();
  const mentionString =
    mentions.length > 0 ? mentions.join(" ") : "(no users configured to ping)";

  const message = [
    `🔊 **${joiner.displayName}** just joined <#${targetChannelId}>!`,
    `${mentionString} — hop in!`,
  ].join("\n");

  try {
    const channel = await client.channels.fetch(notificationChannelId);
    if (!channel?.isTextBased()) {
      console.error(
        `[Voice] Notification channel ${notificationChannelId} is not text-based.`
      );
      return;
    }
    await channel.send(message);
    console.log(
      `[Voice] Notified #${channel.name} about ${joiner.user.tag} joining.`
    );
  } catch (err) {
    console.error("[Voice] Failed to send notification:", err.message);
  }
}

module.exports = { joinVoice, handleVoiceStateUpdate };
