# TML Bot v1.1

Standalone Node.js + discord.js v14 bot for the TML league. It does not use or connect to the FDL bot.

## Features

- **Team Claimer:** 32 NFL teams, click-to-claim, one team per member, waitlist and Waitlist Coach role swaps, release/sync tools. No screenshot verification.
- **Open Teams:** current board in `1563478213630632006`, kept at the bottom; openings announced in `1481828808087699516`.
- **Prospect Maker:** posts prospects in `1561708316000784384`, generates all 54 Madden ratings, saves them, and posts the full sheet in `1570602743834611924`.
- **Scouting:** `/scout-player`, `/scout-sheet`, and admin-only `/reset-scout-sheets`.
- **Player of the Week:** four winners type a +3 **NON-PHYSICAL** attribute and player. The public post shows each user beside their attribute and player.
- **Game of the Week:** reads results from FRANCHISE HUB `1438019992347082823`, checks the winner's team, keeps the source link, and shows the winner's +3 attribute and player.
- **Mystery Box:** one roll per user per Pacific day.

## Requirements

- Node.js **18.17+** (20 or 22 recommended).
- A separate Discord application/bot for TML. Do not reuse the FDL token.

## Discord setup

1. Open https://discord.com/developers/applications and create/select the TML application.
2. **Bot → Reset Token** supplies `DISCORD_TOKEN`.
3. Enable **Server Members Intent** and **Message Content Intent** under Bot → Privileged Gateway Intents.
4. **General Information → Application ID** supplies `CLIENT_ID`.
5. Invite with scopes `bot` and `applications.commands`, plus Manage Roles, View Channels, Send Messages, Read Message History, Embed Links, Manage Messages, and Mention Everyone (only if the waitlist role is not mentionable).
6. Put the bot role above the team, waitlist, and Waitlist Coach roles.
7. Give the bot View Channel, Send Messages, and Read Message History in the prospect, stat-sheet, FRANCHISE HUB, team-opened, and open-teams channels.

## Install

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Fill these required values in `.env`:

| Setting | Value |
|---|---|
| `DISCORD_TOKEN` | TML bot token |
| `CLIENT_ID` | Discord Application ID |
| `GUILD_ID` | TML server ID |
| `WAITLIST_ROLE_ID` | Optional; otherwise role named `waitlist` |
| `WAITLIST_COACH_ROLE_ID` | Optional; otherwise role named `Waitlist Coach` |

All channel IDs are prefilled. `PROSPECT_STATS_CHANNEL_ID=1570602743834611924` is the new stat-sheet destination.

## Start and register commands

```bash
npm run check
npm test
npm run deploy
npm start
```

Startup also registers the guild commands automatically. For continuous running, use a process manager such as `npx pm2 start index.js --name tml-bot`.

## First-time Discord commands

1. `/setup-nfl-teams` in the claim channel. Use `post-panels:false` to create/link roles without posting buttons.
2. `/waitlist-button` where members join the waitlist.
3. `/prospect-maker` and `/mystery-box-post` where those buttons belong.
4. The Open Teams board posts itself on startup.

## All 19 commands

**Teams:** `/setup-nfl-teams`, `/sync-teams`, `/my-team`, `/release-member`, `/release-team`, `/waitlist-button`

**Prospects/scouting:** `/prospect-maker`, `/scout-player`, `/scout-sheet`, `/reset-scout-sheets`

**Awards:** `/player-of-the-week`, `/game-of-the-week`, `/auto-potw`

**Madden link:** `/ea-connect`, `/ea-status`, `/ea-refresh`, `/ea-disconnect`

**Mystery Box:** `/mystery-box-post`, `/mystery-box-checker`

Admin commands are both hidden by Discord permissions and checked again by the bot.

## Prospect ratings

The three-step Prospect Maker flow is unchanged. On final submission, the bot:

1. Posts the prospect normally.
2. Randomizes all 54 supplied Madden attributes and saves the sheet before trying to post it.
3. Rolls development first: **Normal 35%**, **Star 35%**, **Superstar 20%**, **X-Factor 10%**.
4. Applies the FDL position-true rating rules. Every position has **core** attributes (high, scaling with dev trait), **secondary** attributes (moderate) and everything else (low, capped at 66). A CB never gets QB, OL or kicker ratings, even if one is typed as a strength.

   | Dev trait | Core | Secondary | Off-position |
   |---|---|---|---|
   | Normal | 78–87 | 58–72 | 22–48 |
   | Star | 81–90 | 62–75 | 24–50 |
   | Superstar | 86–94 | 66–78 | 26–52 |
   | X-Factor | 89–97 | 70–82 | 28–54 |

5. Physicals depend on position and dev trait: Superstar and X-Factor get elite physicals (90+); Stars stay solid (80+). Positions that do not use a physical (for example OL speed) keep it lower.
6. Typed strengths: a core strength rolls 90–99, a secondary strength 78–86, and off-position strengths stay low. Typed weaknesses: core 70–77, secondary 48–58, physical −4 to −8, other 20–35. Unknown positions use ATH, and free-text positions (DB, Nickel, Slot WR, Mike, …) are understood.
7. Applies modest height adjustments, then the speed floors: **WR** Speed 88+ and Speed/Acceleration 86+ (89+ for Superstar/X-Factor); **CB, S, HB** Speed 88+; every other position except EDGE, DT, OL, K and P Speed 85+.
8. Posts the full sheet in the stat-sheet channel, split across messages if needed. The button, the three-step form and the sheet layout are unchanged.

Existing prospects in `data/prospects.json` are given saved sheets on upgrade so they can be scouted, but old sheets are **not** reposted. Sheets that were already generated keep their saved ratings; only new prospects use the new rules.

## Scouting rules

- `/scout-player player:<name>` reveals one random attribute from that prospect's position-based pool. QB pools include accuracies; WR pools include route running, for example.
- There is a **1%** chance to reveal all 54 attributes and an independent **20%** chance to reveal the development trait.
- Each user gets **one scout per two-day window**. Windows reset every two days at **12:00 PM America/Los_Angeles** (PST/PDT as applicable).
- Reveals are private to the user and persist across restarts.
- `/scout-sheet` lists every rating and development trait that user has revealed; unrevealed information stays hidden.
- `/reset-scout-sheets` is administrator-only. It wipes every user's revealed information and use limits, but keeps generated prospect sheets.

## Player and Game of the Week

`/player-of-the-week week winner1 winner2 winner3 winner4`: only those four users can claim. Speed, Acceleration, Agility, Strength, Jumping, Change of Direction, Stamina, and Injury (including common abbreviations/spellings) are rejected with a Try Again button.

`/game-of-the-week week winner [reason]`: finds the winner's NFL role, searches bot posts in FRANCHISE HUB, parses the score, and verifies that team won. It supports numeric weeks plus:

- Wild Card / Wildcard
- Divisional / Divisional Round
- Championship / Conference Championship
- NFC Championship
- AFC Championship
- Super Bowl / Superbowl / SB

Recognized score layouts include `Ravens 24 vs 17 Steelers`, `Commanders defeat Browns 20–3`, `Ravens 24, Steelers 17`, `Ravens vs Steelers 24-17`, and one team/score per line. Text, embeds, and Discord Components V2 posts are read. If no matching result is found, the bot says so and posts nothing.

## Madden link

Ported from the FDL bot. An administrator runs `/ea-connect`, signs into the EA account that owns the Madden NFL 27 PC franchise, pastes the redirect URL, then picks the persona and the Connected Franchise. The franchise refreshes every 10 minutes; `/ea-status`, `/ea-refresh` and `/ea-disconnect` manage it. The saved EA session is stored in `data/ea-connection.json` (owner-only permissions). Do not share that file. EA's endpoints are unofficial and can change without notice. The link does not change how team claims work.

## Auto Player of the Week

After a week is simmed, Madden publishes its weekly awards (AFC/NFC Offense and AFC/NFC Defense). When they first appear for a finished week, TML posts a **new** Player of the Week message in the usual TML layout with the **Claim Award** button, and shows each Madden award line under the winner it belongs to. Winners are the Discord owners of those players' claimed teams; awards for unclaimed teams are skipped. If a team owner won two awards they get one +3. If Madden's export has no awards yet, the best performer per slot from the week's stats is used instead.

- Posts in channel `1550304580695367710` (override with `POTW_CHANNEL_ID` in `.env`) and checks every 15 minutes. `AUTO_POTW=false` turns automatic posting off. The bot needs View Channel and Send Messages there.
- `/auto-potw [week] [force]` posts now. A week is only posted once unless `force` is true.
- Optional: `AWARD_FIELDS=field1,field2` adds EA field names to look for awards in.

## Data

Everything is stored under TML's own `data/` directory with atomic writes. Missing files are created; corrupt files are backed up before reset.

| File | Contents |
|---|---|
| `team-roles.json` | TML team role configuration |
| `team-claims.json` | Current claims and history |
| `waitlist.json` | Waitlist joins/opening announcements |
| `open-teams-message.json` | Board message location |
| `player-of-the-week.json` | POTW awards/submissions |
| `game-of-the-week.json` | GOTW awards/submissions |
| `mystery-box.json` | Mystery Box claims/history |
| `prospects.json` | Original prospect posts |
| `prospect-sheets.json` | All generated ratings and development traits |
| `scouting.json` | User reveals, scout history, and two-day use limits |
| `ea-connection.json` | Saved EA/Madden session and franchise (keep private) |
| `auto-potw.json` | Which weeks already got an auto Player of the Week |

Back up `data/` before upgrading. To upgrade an existing installation, replace the code files, keep `.env` and `data/`, then run `npm install && npm run deploy` and restart.

## Differences from the original bots

Only requested features are included; screenshot verification was vetoed and is absent. Team Claimer `teams.js` was never provided, so it was rebuilt rather than inspected. The Team Claimer `index.js`, `package.json`, `config.json`, and FDL bot ZIP were supplied earlier. No FDL role IDs, claims, files, or runtime connections are used.

The FRANCHISE HUB parser and new Discord interactions have automated tests, but they still need to be tried against the live TML server.
