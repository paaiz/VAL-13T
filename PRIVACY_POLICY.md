# Privacy Policy — VAL-13T

**Last Updated:** October 30, 2026

This Privacy Policy explains what information **VAL-13T** ("the Bot", "we", "our") collects, how it is used and stored, and how you can delete your data at any time.

---

## 1. Information We Collect
VAL-13T only collects the minimum data necessary to provide its VALORANT Store checking features:

1. **Discord Identifiers:**
   - Your **Discord User ID** (used to associate your Discord account with your VALORANT session, manage notifications, and maintain access controls).
   - **Discord Server (Guild) IDs** where the Bot is added.
2. **Command Telemetry & Usage Logs:**
   - Basic operational metrics when you run a slash command: the command name (e.g., `/store`, `/wishlist`), execution timestamp, Discord User ID, and Server ID.
3. **VALORANT Session Data (Only if you use `/login`):**
   - Your Riot Games **PUUID** (Player Universally Unique Identifier), **Riot ID (`GameName#TagLine`)**, and **Game Shard/Region** (e.g., `ap`, `na`, `eu`, `kr`).
   - Temporary Riot authentication headers (`Authorization` Bearer token and `X-Riot-Entitlements-JWT`) and, if voluntarily provided by you, your `ssid` session cookie or OAuth2 `refresh_token` for automatic token refresh.

> **Important:** VAL-13T **NEVER** asks for, receives, logs, or stores your Riot Games username or password.

## 2. How We Use Your Information
Your data is used **exclusively** to operate the Bot and execute the features you explicitly trigger in Discord:
- Fetching your Daily Store (`/store`)
- Fetching your Featured Bundles (`/bundles`)
- Fetching your Accessory Store (`/accessories`)
- Fetching your Night Market (`/nightmarket`)
- Fetching your VP, RP, and Kingdom Credits balances (`/balances`)
- Delivering your Daily Store and Wishlist notifications (`/notification`, `/wishlist`)
- Monitoring bot stability, feature popularity, and command performance to improve response times and guide future feature development.

We **never** sell, rent, trade, or share your data with any third parties, advertisers, or external services (other than making the direct API requests to Riot Games' servers on your behalf when you run a command).

## 3. Data Storage & Retention
- Authentication tokens and user session data are stored securely solely for the duration of your active login session with the Bot.
- Command execution telemetry is stored in our local database for a maximum of 90 days for performance metrics and debugging, after which it is permanently purged.
- Guild IDs are removed automatically when the Bot leaves or is kicked from a Discord server.

## 4. How to Delete Your Data (Right to Erasure)
You have full control over your data at all times:
- **Instant Self-Service Deletion:** Simply run the **`/logout`** slash command in any server with VAL-13T. This immediately and permanently deletes your Riot PUUID, username, tokens, and session cookies from our storage.
- **Manual Deletion Request:** If you are unable to run `/logout` or wish to request complete removal of any remaining Discord User ID records, you may contact the developer (`Paiz`) via our Support Server or GitHub repository.

## 5. Changes to This Privacy Policy
We may update this Privacy Policy periodically to reflect changes in our features or legal requirements. Updates will be reflected by the "Last Updated" date at the top of this page.

## 6. Contact
If you have questions about this Privacy Policy or your data, please reach out to the developer (`Paiz`) through our Discord Support Server or GitHub repository.
