const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");

let connection = null;

function buildMentionList() {
  const raw = process.env.USERS_TO_PING || "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => `<@${id}>`);
}

function joinVoice(client) {
  const guildId = process.env.GUILD_ID;
  const channelId = process.env.VOICE_CHANNEL_ID;

  if (!guildId || !channelId) {
    console.error("[Voice] GUILD_ID or VOICE_CHANNEL_ID missing from .env");
    return;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    console.error(`[Voice] Guild ${guildId} not in cache`);
    return;
  }

  connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true,
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      console.warn("[Voice] Connection lost. Rejoining…");
      connection.destroy();
      joinVoice(client);
    }
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log(`[Voice] Connected to channel ${channelId}`);
  });

  connection.on("error", (err) => {
    console.error("[Voice] Error:", err.message);
  });
}

async function handleVoiceStateUpdate(oldState, newState, client) {
  const targetChannelId = process.env.VOICE_CHANNEL_ID;
  const notificationChannelId = process.env.NOTIFICATION_CHANNEL_ID;

  if (!targetChannelId || !notificationChannelId) return;
  if (newState.member?.user.bot) return;

  const wasInTarget = oldState.channelId === targetChannelId;
  const isInTarget = newState.channelId === targetChannelId;

  if (wasInTarget || !isInTarget) return;

  const joiner = newState.member;
  const mentions = buildMentionList();
  const mentionString = mentions.length > 0 ? mentions.join(" ") : "";

  const message = `🔊 **${joiner.displayName}** just joined <#${targetChannelId}>!\n${mentionString} — hop in!`;

  try {
    const channel = await client.channels.fetch(notificationChannelId);
    if (!channel?.isTextBased()) return;
    await channel.send(message);
    console.log(`[Voice] Notified about ${joiner.user.tag} joining`);
  } catch (err) {
    console.error("[Voice] Notification failed:", err.message);
  }
}

module.exports = { joinVoice, handleVoiceStateUpdate };
