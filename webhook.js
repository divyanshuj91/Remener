const express = require("express");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function startWebhookServer(client) {
  const app = express();
  const port = parseInt(process.env.PORT, 10) || 3000;

  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.post("/github-webhook", async (req, res) => {
    try {
      const event = req.headers["x-github-event"];
      const payload = req.body;

      if (event === "issues" && payload?.action === "opened") {
        await handleNewIssue(payload, client);
        return res.status(200).json({ success: true });
      }

      if (event === "pull_request" && payload?.action === "opened") {
        await handleNewPR(payload, client);
        return res.status(200).json({ success: true });
      }

      return res.status(200).json({ ignored: true });
    } catch (err) {
      console.error("[Webhook] Error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.listen(port, () => {
    console.log(`[Webhook] Listening on http://localhost:${port}`);
    console.log(`[Webhook] Endpoint: POST http://localhost:${port}/github-webhook`);
  });
}

async function handleNewIssue(payload, client) {
  const { issue, repository } = payload;
  if (!issue || !repository) return;

  const description = issue.body
    ? issue.body.length > 1024 ? issue.body.slice(0, 1021) + "…" : issue.body
    : "*No description provided.*";

  const labels = issue.labels?.length > 0
    ? issue.labels.map((l) => `\`${l.name}\``).join(", ")
    : "None";

  const embed = new EmbedBuilder()
    .setColor(0x238636)
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
      { name: "🏷️ Labels", value: labels, inline: true },
      { name: "🙋 Assigned To", value: "*Unclaimed — click below to take it*", inline: false }
    )
    .setFooter({ text: repository.full_name })
    .setTimestamp(new Date(issue.created_at));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`claim_issue_${issue.number}`)
      .setLabel("Take this Issue")
      .setStyle(ButtonStyle.Success)
  );

  await sendToAnnouncements(client, { embeds: [embed], components: [row] });
  console.log(`[Webhook] Posted issue #${issue.number}: ${issue.title}`);
}

async function handleNewPR(payload, client) {
  const { pull_request: pr, repository } = payload;
  if (!pr || !repository) return;

  const description = pr.body
    ? pr.body.length > 1024 ? pr.body.slice(0, 1021) + "…" : pr.body
    : "*No description provided.*";

  const embed = new EmbedBuilder()
    .setColor(0x8957e5)
    .setAuthor({
      name: pr.user?.login ?? "Unknown",
      iconURL: pr.user?.avatar_url,
      url: pr.user?.html_url,
    })
    .setTitle(`🔀 New PR #${pr.number}: ${pr.title}`)
    .setURL(pr.html_url)
    .setDescription(description)
    .addFields(
      { name: "📦 Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "🔃 Branch", value: `\`${pr.head?.ref}\` → \`${pr.base?.ref}\``, inline: true },
      { name: "👀 Reviewers", value: "*No reviewers yet — click below*", inline: false }
    )
    .setFooter({ text: repository.full_name })
    .setTimestamp(new Date(pr.created_at));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`review_pr_${pr.number}`)
      .setLabel("Review this PR")
      .setStyle(ButtonStyle.Primary)
  );

  await sendToAnnouncements(client, { embeds: [embed], components: [row] });
  console.log(`[Webhook] Posted PR #${pr.number}: ${pr.title}`);
}

async function sendToAnnouncements(client, messagePayload) {
  const channelId = process.env.ANNOUNCEMENT_CHANNEL_ID;
  if (!channelId) {
    console.error("[Webhook] ANNOUNCEMENT_CHANNEL_ID not set");
    return;
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    console.error(`[Webhook] Channel ${channelId} is not text-based`);
    return;
  }

  await channel.send(messagePayload);
}

module.exports = { startWebhookServer };
