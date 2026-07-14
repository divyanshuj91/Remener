/**
 * webhook.js — GitHub Webhook Receiver for New Issues
 *
 * Responsibilities:
 *  1. Spin up an Express server on the configured PORT.
 *  2. Accept POST /github-webhook payloads from GitHub.
 *  3. When a new issue is opened, build a rich Discord embed
 *     and post it to the ANNOUNCEMENT_CHANNEL_ID text channel.
 */

const express = require("express");
const { EmbedBuilder } = require("discord.js");

/**
 * Initialise the Express webhook server.
 *
 * @param {import("discord.js").Client} client — The logged-in Discord client.
 */
function startWebhookServer(client) {
  const app = express();
  const port = parseInt(process.env.PORT, 10) || 3000;

  // ── Middleware ─────────────────────────────────────────────────────────
  app.use(express.json());

  // ── Health-check endpoint (useful for uptime monitors) ────────────────
  app.get("/", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // ── GitHub webhook endpoint ───────────────────────────────────────────
  app.post("/github-webhook", async (req, res) => {
    try {
      const event = req.headers["x-github-event"];
      const payload = req.body;

      // We only care about issue events where a new issue is opened.
      if (event !== "issues" || payload?.action !== "opened") {
        return res.status(200).json({ ignored: true, reason: "not a new issue" });
      }

      const { issue, repository } = payload;

      if (!issue || !repository) {
        return res.status(400).json({ error: "Malformed payload: missing issue or repository." });
      }

      // ── Build the Discord embed ─────────────────────────────────────
      const description = issue.body
        ? issue.body.length > 1024
          ? issue.body.slice(0, 1021) + "…"
          : issue.body
        : "*No description provided.*";

      const labels =
        issue.labels && issue.labels.length > 0
          ? issue.labels.map((l) => `\`${l.name}\``).join(", ")
          : "None";

      const embed = new EmbedBuilder()
        .setColor(0x238636) // GitHub green
        .setAuthor({
          name: issue.user?.login ?? "Unknown",
          iconURL: issue.user?.avatar_url,
          url: issue.user?.html_url,
        })
        .setTitle(`🐛 New Issue #${issue.number}: ${issue.title}`)
        .setURL(issue.html_url)
        .setDescription(description)
        .addFields(
          { name: "📦 Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
          { name: "🏷️ Labels", value: labels, inline: true }
        )
        .setFooter({ text: `${repository.full_name}` })
        .setTimestamp(new Date(issue.created_at));

      // ── Send to Discord ─────────────────────────────────────────────
      const announcementChannelId = process.env.ANNOUNCEMENT_CHANNEL_ID;

      if (!announcementChannelId) {
        console.error("[Webhook] ANNOUNCEMENT_CHANNEL_ID is not set in .env.");
        return res.status(500).json({ error: "ANNOUNCEMENT_CHANNEL_ID not configured." });
      }

      const channel = await client.channels.fetch(announcementChannelId);

      if (!channel?.isTextBased()) {
        console.error(
          `[Webhook] Channel ${announcementChannelId} is not a text channel.`
        );
        return res.status(500).json({ error: "Announcement channel is not text-based." });
      }

      await channel.send({ embeds: [embed] });
      console.log(
        `[Webhook] Posted issue #${issue.number} ("${issue.title}") to #${channel.name}.`
      );

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("[Webhook] Error processing payload:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  });

  // ── Start listening ───────────────────────────────────────────────────
  app.listen(port, () => {
    console.log(`[Webhook] Express server listening on http://localhost:${port}`);
    console.log(`[Webhook] GitHub endpoint: POST http://localhost:${port}/github-webhook`);
  });
}

module.exports = { startWebhookServer };
