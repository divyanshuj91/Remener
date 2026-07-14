# Remener — Discord Voice Monitor & GitHub Bot

Discord bot that monitors a voice channel 24/7 and forwards GitHub issues & PRs to Discord with interactive claim/review buttons.

---

## Features

- **🔊 Voice Monitor** — Bot sits in a voice channel and pings your team when someone joins
- **🐛 Issue Alerts** — New GitHub issues appear as embeds with a **"Take this Issue"** button
- **🔀 PR Review** — New PRs appear as embeds with a **"Review this PR"** button
- **🙋 Self-Assign** — Team members click buttons to volunteer — the embed updates live

---

## Quick Start

```bash
git clone https://github.com/divyanshuj91/Remener.git
cd Remener
npm install
cp .env.example .env   # fill in your values
npm start
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from [Developer Portal](https://discord.com/developers/applications) |
| `GUILD_ID` | Right-click server name → Copy Server ID |
| `VOICE_CHANNEL_ID` | Right-click voice channel → Copy Channel ID |
| `NOTIFICATION_CHANNEL_ID` | Text channel for voice join alerts |
| `ANNOUNCEMENT_CHANNEL_ID` | Text channel for GitHub issue/PR embeds |
| `USERS_TO_PING` | Comma-separated user IDs to ping on VC joins |
| `PORT` | Express server port (default: 3000) |

---

## GitHub Webhook Setup

1. Go to your repo → **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL:** `https://<your-domain>/github-webhook`
3. **Content type:** `application/json`
4. **Events:** Select individual → ✅ **Issues** and ✅ **Pull requests**
5. Click **Add webhook**

For local testing, use ngrok:
```bash
npx -y ngrok http 3000
```

---

## Project Structure

```
Remener/
├── index.js          # Entry point — client, events, error handling
├── voice.js          # Voice channel join + monitoring
├── webhook.js        # Express server + GitHub issue/PR embeds
├── interactions.js   # Button click handlers (claim/review)
├── package.json
├── .env.example
└── README.md
```

---

## Required Bot Permissions

- View Channels, Send Messages, Embed Links
- Connect, Speak
- **Privileged Intent:** Server Members Intent

---

## License

MIT
