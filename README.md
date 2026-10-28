<div align="center">

# 🎯 VAL-13T — VALORANT Store Discord Bot

**Check your Daily Store, Featured Bundles, Kingdom Credits Accessory Store, Night.Market, and Wallet Balances directly from Discord.**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.5.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![SQLite](<https://img.shields.io/badge/Database-Node%20SQLite%20(WAL)-003B57?logo=sqlite&logoColor=white>)](https://nodejs.org/api/sqlite.html)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

</div>

---

## 📖 Overview

**VAL-13T** is a fast, lightweight, and self-hostable Discord Bot built with **Discord.js v14**, **Node.js v22 (`node:sqlite`)**, and **`@napi-rs/canvas`**. It connects to Riot Games' official Storefront v3 endpoints to render your personalized VALORANT shop offers, bundle details, and skin upgrade video previews right inside Discord—without ever asking for or storing your Riot Games password.

---

## ✨ Key Features

- 🛒 **Daily Store (`/store`)**
  - Generates a custom visual store card of your 4 daily weapon skin offers using `@napi-rs/canvas`.
  - Includes an interactive **Video Preview** dropdown to watch skin upgrade levels (`VFX`, `Animation`, `Finisher`) ephemerally inside Discord.
- 🔥 **Featured Bundles (`/bundles`)**
  - View active Featured Bundles with discounted & base VP prices, expiration timers, and high-resolution bundle banners.
  - **Smart Pagination & Item Inspector**: Browse multiple bundles automatically and inspect individual bundle items, prices, high-res previews, and skin upgrade videos.
- 👑 **Accessory Store (`/accessories`)**
  - Paginated view of your weekly **Kingdom Credits (KC)** rotation (`Player Cards`, `Gun Buddies`, `Sprays`, and `Player Titles`) with dynamic **Full Card**, **Wide Banner**, and **Full Preview** links.
- 🌙 **Night.Market (`/nightmarket`)**
  - Interactive confirmation prompt before revealing your 6 discounted Night.Market weapon skins on a custom canvas image.
- 💰 **Wallet Balances (`/balances`)**
  - Check your **VALORANT Points (VP)**, **Radianite Points (RP)**, and **Kingdom Credits (KC)** (private/ephemeral by default, with an optional `hide` toggle).
- 🔍 **Instant Skin & Chroma Lookup (`/skin`)**
  - Search any weapon skin in VALORANT with instant autocomplete, VP prices, tier info, upgrade levels, interactive chroma variants, and weapon upgrade video previews.
- 🎯 **Skin Wishlist & Daily Reset Alerts (`/wishlist` & `/notification`)**
  - Track your favorite skins and automatically receive a direct message when any wishlisted skin hits your store at **07:00 AM**.
  - Option to receive your full Daily Store canvas image in your DMs automatically every morning.
- 👥 **Multi-Account Support (`/accounts`)**
  - Link up to 5 VALORANT accounts per Discord user and seamlessly switch active accounts via an interactive dropdown.
- 🔐 **Passwordless Riot OAuth with Background Auto-Refresh (`/login` & `/logout`)**
  - Uses Riot's official Authorization Code flow (`client_id=riot-client`) with `offline_access` (`refresh_token`) to automatically refresh expired tokens in the background—no need to re-login every hour!
- 🔄 **Automated Skin & Video Cache (`node-cron`)**
  - Automatically syncs the latest VALORANT weapon skins, tiers, and video preview URLs from [Valorant-API](https://valorant-api.com) on startup and daily at **07:00 WIB (`Asia/Jakarta`)**.
- 🗄️ **Zero-Dependency Embedded SQLite Database**
  - Powered by Node.js 22's native `node:sqlite` in WAL mode (`data/val13t.db`)—no external database server required.

---

## 💬 Commands

### Slash Commands

| Command         | Subcommands / Options   | Description                                                                 |
| :-------------- | :---------------------- | :-------------------------------------------------------------------------- |
| `/store`        | —                       | View your daily 4 VALORANT weapon skin offers & watch video previews        |
| `/wishlist`     | `add <skin>`            | Add a weapon skin to your wishlist (sends DM alert when in store)           |
|                 | `remove <skin>`         | Remove a skin from your active account's wishlist                           |
|                 | `list`                  | View and manage your current skin wishlist                                  |
| `/notification` | `daily-store <enabled>` | Enable or disable receiving your full Daily Store image via DM at 07:00 AM  |
|                 | `status`                | View and toggle your current DM notification settings                       |
|                 | `test`                  | Send a test Daily Store & Wishlist notification to your DMs right now       |
| `/skin`         | `name <skin>`           | Look up any weapon skin—price, tier, chromas & video previews               |
| `/bundles`      | —                       | View active Featured Bundles, inspect included items & watch video previews |
| `/accessories`  | —                       | View your weekly Kingdom Credits Accessory Store rotation                   |
| `/nightmarket`  | —                       | View your 6 discounted Night.Market skins                                   |
| `/balances`     | `hide` _(optional)_     | Check your current VP, RP, and Kingdom Credits balances                     |
| `/accounts`     | —                       | Manage up to 5 linked accounts and switch your active account               |
| `/login`        | `input` _(optional)_    | Link your Riot Games account via OAuth Redirect URL                         |
| `/logout`       | —                       | Unlink your Riot Games account and remove stored session data               |
| `/help`         | —                       | Open the interactive command category guide                                 |
| `/status`       | —                       | View bot statistics, uptime, ping, server count, and runtime environment    |

### Owner Prefix Commands (`v-`)

| Command                       | Aliases                       | Description                                                           |
| :---------------------------- | :---------------------------- | :-------------------------------------------------------------------- |
| `v-save`                      | —                             | Manually trigger a weapon skin & video cache sync (`data/skins.json`) |
| `v-notifier [force]`          | `run-notifier`, `check-store` | Manually run daily store & wishlist check for all accounts (force DM) |
| `v-serverlist`                | `guild_list`, `server_list`   | Paginated list of all servers the bot is currently in                 |
| `v-blacklist [remove] <user>` | —                             | Blacklist or unblacklist a Discord user from using the bot            |
| `v-leaveserver <guildId>`     | `leave_guild`, `leave_server` | Force the bot to leave a specific server by ID                        |
| `v-deploy`                    | —                             | Manually deploy slash commands to the current guild                   |
| `v-undeploy`                  | —                             | Remove guild-scoped slash commands from the current guild             |
| `v-emit <event>`              | —                             | Simulate `guildCreate` or `guildDelete` events for testing            |

---

## 📁 Project Structure

```text
VAL-13T/
├── data/                        # Persistent runtime storage (auto-created, Docker volume)
│   ├── val13t.db                # Native SQLite database (users & blacklist)
│   └── skins.json               # Auto-synced weapon skins & video preview cache
├── public/
│   └── logos/                   # Bot avatar/logo assets
├── src/
│   ├── index.js                 # Application entry point
│   ├── assets/
│   │   ├── fonts/               # Custom canvas font (.otf)
│   │   ├── images/              # Store & Night.Market canvas backgrounds
│   │   └── json/                # config.json, config.example.json & tier.json
│   ├── commands/
│   │   ├── information/         # /help, /status
│   │   └── valorant/            # /login, /logout, /store, /bundles, /accessories, /balances, /nightmarket
│   ├── events/
│   │   ├── clientReady.js       # Startup cache sync, daily cron job & slash command deployment
│   │   ├── guild/               # guildCreate.js, guildDelete.js
│   │   ├── interaction/         # interactionCreate.js (Slash commands, Buttons & Login Modal)
│   │   └── message/             # messageCreate.js (Bot mention & Owner prefix commands)
│   ├── prefixCommands/          # Owner-only prefix commands
│   └── structures/
│       ├── database/            # SQLite Database.js wrapper
│       ├── valorant/            # Riot OAuth & Storefront v3 client, Cache, Shop & Canvas designs
│       ├── Command.js
│       ├── Event.js
│       ├── Logger.js
│       ├── MainClient.js
│       ├── PrefixCommand.js
│       └── Util.js
├── Dockerfile
├── docker-compose.yml
├── PRIVACY_POLICY.md
└── TERMS_OF_SERVICE.md
```

---

## 🚀 Getting Started (Local Installation)

### 1. Prerequisites

- **Node.js `>= 22.5.0`** (v22 LTS recommended — required for built-in `node:sqlite`)
- A **Discord Bot Token** from the [Discord Developer Portal](https://discord.com/developers/applications)
  - Enable **Server Members Intent** and **Message Content Intent** under the _Bot_ tab.

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/paaiz/VAL-13T.git
cd VAL-13T
npm install
```

### 3. Configure Environment & Bot Settings

1. Copy `.env.example` to `.env` and fill in your credentials:
   ```env
   BOT_TOKEN=your_production_discord_bot_token
   DEVELOPMENT_TOKEN=your_development_bot_token_optional
   JOIN_WEBHOOK=https://discord.com/api/webhooks/...
   LEAVE_WEBHOOK=https://discord.com/api/webhooks/...
   ```
2. Copy `src/assets/json/config.example.json` to `src/assets/json/config.json` and configure your owner Discord ID and links:
   ```json
   {
     "client": {
       "prefix": "v-",
       "owners": ["YOUR_DISCORD_USER_ID"],
       "development": false
     },
     "defaultPerms": ["SEND_MESSAGES", "VIEW_CHANNEL"],
     "links": {
       "botInvite": "https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025770560&scope=bot%20applications.commands",
       "supportInvite": "https://discord.gg/your_server",
       "saweria": "https://saweria.co/your_profile"
     }
   }
   ```

### 4. Start the Bot

```bash
npm start
```

---

## 🐳 Docker Deployment Tutorial

**VAL-13T** is pre-configured for 24/7 deployment on a homelab server, Raspberry Pi / Mini PC, or VPS using Docker. All persistent data (`data/val13t.db` and `data/skins.json`) is stored inside a mounted `./data` volume so user sessions and blacklists survive container restarts and image updates.

### Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) & [Docker Compose](https://docs.docker.com/compose/install/) installed on your server.

---

### Step 1: Clone the Repository on Your Server

SSH into your homelab/server and clone the project (use SSH if the repository is private):

```bash
# Via SSH (recommended for private repo / Deploy Key)
git clone git@github.com:PaizTralala/VAL-13T.git
cd VAL-13T
```

---

### Step 2: Prepare `.env` and `config.json`

> ⚠️ **Important:** Create both files **before** running `docker compose up` so Docker mounts `config.json` as a file rather than an empty directory.

1. Create your `.env` file from the example template:

   ```bash
   cp .env.example .env
   nano .env
   ```

   Fill in your bot token:

   ```env
   BOT_TOKEN=your_discord_bot_token_here
   DEVELOPMENT_TOKEN=
   JOIN_WEBHOOK=
   LEAVE_WEBHOOK=
   ```

2. Create your `src/assets/json/config.json` file from the example template:

   ```bash
   cp src/assets/json/config.example.json src/assets/json/config.json
   nano src/assets/json/config.json
   ```

   Set `"development": false` and add your Discord User ID under `"owners"`.

3. Ensure the `data/` directory exists for persistent SQLite & skin cache storage:
   ```bash
   mkdir -p data
   ```

---

### Step 3: Build & Start the Container

Run Docker Compose in detached mode (`-d`):

```bash
docker compose up -d --build
```

What happens automatically:

- Pulls `node:22-bookworm-slim` and installs required font rendering libraries (`fontconfig`, `libfreetype6`) for `@napi-rs/canvas`.
- Installs production Node.js dependencies.
- Mounts `./data` to `/app/data` (persisting `val13t.db` and `skins.json` on your host disk).
- Sets `TZ=Asia/Jakarta` so the daily **07:00 AM** skin cache cron job runs on time.
- Configures `restart: unless-stopped` so the bot automatically starts back up if the server reboots.

---

### Step 4: Verify Logs & Container Status

Check that the bot logged in and synced the weapon skins cache:

```bash
docker compose logs -f
```

Expected output:

```text
[READY] [25/10/2026, 17:00:00] : SQLite Database Ready (/app/data/val13t.db)
[READY] [25/10/2026, 17:00:01] : Logged In As VAL-13T#0516
[READY] [25/10/2026, 17:00:01] : Loaded 5 Events!
[READY] [25/10/2026, 17:00:01] : Loaded 7 Prefix Commands!
[READY] [25/10/2026, 17:00:03] : Successfully Synced 3400+ Weapon Skin Levels!
[READY] [25/10/2026, 17:00:03] : Loaded 9 Slash Commands!
[READY] [25/10/2026, 17:00:04] : Slash Commands Deployed Globally!
```

---

### Managing & Updating the Bot on Docker

| Task                       | Command                                    |
| :------------------------- | :----------------------------------------- |
| **View live logs**         | `docker compose logs -f`                   |
| **Check container status** | `docker compose ps`                        |
| **Restart the bot**        | `docker compose restart`                   |
| **Stop the bot**           | `docker compose down`                      |
| **Update to latest code**  | `git pull && docker compose up -d --build` |
| **Backup SQLite database** | `cp data/val13t.db data/val13t.backup.db`  |

---

### Alternative: Run with `docker build` & `docker run` (Without Compose)

If you prefer running Docker CLI directly without Docker Compose:

```bash
# 1. Build the image
docker build -t val-13t:latest .

# 2. Run the container
docker run -d \
  --name val-13t \
  --restart unless-stopped \
  --env-file .env \
  -e TZ=Asia/Jakarta \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/src/assets/json/config.json:/app/src/assets/json/config.json:ro" \
  val-13t:latest
```

---

## 📜 Legal & Disclaimer

- [Terms of Service](TERMS_OF_SERVICE.md)
- [Privacy Policy](PRIVACY_POLICY.md)

> **VAL-13T** isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties (including VALORANT) are trademarks or registered trademarks of Riot Games, Inc.
