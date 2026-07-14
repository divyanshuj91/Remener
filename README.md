# Remener — Discord Voice Monitor & GitHub Webhook Bot

A production-ready Discord bot that sits in a voice channel 24/7 and pings your team when someone joins, plus forwards new GitHub issues to a Discord channel as rich embeds.

---

## Prerequisites

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org/) | v18 or later |
| npm | Bundled with Node |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd Remener
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` in your editor and fill in every value — see the section below for how to get each ID.

### 3. Run

```bash
npm start
```

You should see output like:

```
──────────────────────────────────────────
  ✅  Logged in as Remener#1234
  📡  Serving 1 guild(s)
──────────────────────────────────────────
[Voice] Connected to voice channel 123456789012345678.
[Webhook] Express server listening on http://localhost:3000
[Webhook] GitHub endpoint: POST http://localhost:3000/github-webhook
```

---

## How to Get Discord IDs

> **Enable Developer Mode first:** Discord Settings → Advanced → Developer Mode → ON.

| Variable | How to get it |
|---|---|
| `DISCORD_TOKEN` | [Discord Developer Portal](https://discord.com/developers/applications) → Your App → Bot → **Reset Token** → copy |
| `GUILD_ID` | Right-click the **server name** → *Copy Server ID* |
| `VOICE_CHANNEL_ID` | Right-click the **voice channel** → *Copy Channel ID* |
| `NOTIFICATION_CHANNEL_ID` | Right-click the **text channel** for join alerts → *Copy Channel ID* |
| `ANNOUNCEMENT_CHANNEL_ID` | Right-click the **text channel** for GitHub issues → *Copy Channel ID* |
| `USERS_TO_PING` | Right-click each **user** → *Copy User ID*, then join with commas |

### Required Bot Permissions

When generating the OAuth2 invite link, enable these permissions:

- **Connect** & **Speak** (voice)
- **Send Messages** & **Embed Links** (text channels)
- **View Channels**

**Required Privileged Intents** (Developer Portal → Bot → Privileged Gateway Intents):

- ✅ Server Members Intent

---

## Setting Up the GitHub Webhook

1. Go to your GitHub repository → **Settings** → **Webhooks** → **Add webhook**.
2. **Payload URL:** `https://<your-server-domain>:3000/github-webhook`
   - If you're running locally for development, use a tunnel like [ngrok](https://ngrok.com/):
     ```bash
     ngrok http 3000
     ```
     Then use the generated `https://xxxx.ngrok-free.app/github-webhook` URL.
3. **Content type:** `application/json`
4. **Which events?** Select *"Let me select individual events"* → check **Issues** only.
5. Click **Add webhook**.

From now on, every time a new issue is opened on that repo, the bot will post a rich embed in your announcement channel.

---

## Project Structure

```
Remener/
├── index.js          # Entry point — client setup, event wiring, error handling
├── voice.js          # Voice channel join + voiceStateUpdate handler
├── webhook.js        # Express server + GitHub issue → Discord embed
├── package.json
├── .env.example      # Environment variable template
└── README.md         # You are here
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Bot doesn't join voice | Check `VOICE_CHANNEL_ID` and that the bot has **Connect** permission in that channel. |
| No ping notifications | Make sure `NOTIFICATION_CHANNEL_ID` is a text channel the bot can send in, and `USERS_TO_PING` has valid IDs. |
| Webhook returns 400 | Ensure GitHub is sending `application/json`, not `application/x-www-form-urlencoded`. |
| `GUILD_ID` error on startup | The bot must be **invited to the server** before it can resolve the guild. |

---

## License

MIT
