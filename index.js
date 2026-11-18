// TML Bot — Team Claimer + Open Teams + Prospect Sheets/Scouting + Weekly Awards + Mystery Box + Madden link + Auto POTW.
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const cfg = require("./src/config");

const missing = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID"].filter(k => !process.env[k]);
if (missing.length) { console.error(`Missing ${missing.join(", ")} in .env — copy .env.example to .env and fill it in.`); process.exit(1); }

const { deployCommands } = require("./src/deploy");
const { commandJson } = require("./src/commands");
const teamClaimer = require("./src/teamClaimer");
const openTeams = require("./src/openTeams");
const awards = require("./src/awards");
const mysteryBox = require("./src/mysteryBox");
const prospect = require("./src/prospect");
const scouting = require("./src/scouting");
const eaLink = require("./src/eaLink");
const autoPotw = require("./src/autoPotw");
const { describeError, registerRateLimit } = require("./src/util");

teamClaimer.setTeamsChangedHook(guild => openTeams.requestRefresh(guild));

const modules = [teamClaimer, prospect, scouting, awards, mysteryBox, eaLink, autoPotw];
const commandOwner = new Map();
for (const m of modules) for (const n of m.COMMAND_NAMES) commandOwner.set(n, m);
// Self-check: every registered command has a handler and vice versa.
for (const c of commandJson()) if (!commandOwner.has(c.name)) throw new Error(`No handler for /${c.name}`);
for (const n of commandOwner.keys()) if (!commandJson().some(c => c.name === n)) throw new Error(`Handler for unregistered /${n}`);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.GuildMember]
});

function tmlGuild() { return client.guilds.cache.get(cfg.GUILD_ID) || null; }
const isTml = g => g && g.id === cfg.GUILD_ID; // TML only acts in its own server

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  try { console.log(`Registered ${await deployCommands()} slash commands.`); }
  catch (err) { console.error("Could not register slash commands:", err?.message || err); }
  const guild = tmlGuild();
  if (!guild) { console.error(`The bot is not in GUILD_ID ${cfg.GUILD_ID}. Invite it to the TML server.`); return; }
  await guild.roles.fetch().catch(() => {});
  try { await teamClaimer.onReady(guild); } catch (err) { console.error("Startup claim sync failed:", err?.message || err); }
  openTeams.requestRefresh(guild, 500);
  eaLink.onReady();
  autoPotw.start(client);
});

client.on("guildMemberUpdate", (o, n) => { if (isTml(n.guild)) teamClaimer.onGuildMemberUpdate(o, n).catch(e => console.error("guildMemberUpdate:", e)); });
client.on("guildMemberRemove", m => { if (isTml(m.guild)) teamClaimer.onGuildMemberRemove(m).catch(e => console.error("guildMemberRemove:", e)); });
client.on("messageCreate", message => {
  if (!isTml(message.guild)) return;
  try { openTeams.onMessageCreate(message); } catch (e) { console.error("openTeams messageCreate:", e); }
});

client.on("interactionCreate", async interaction => {
  try {
    if (!interaction.inGuild() || !isTml(interaction.guild)) {
      if (interaction.isRepliable()) await interaction.reply({ content: "TML Bot only works inside the TML server.", ephemeral: true }).catch(() => {});
      return;
    }
    if (interaction.isChatInputCommand()) {
      const owner = commandOwner.get(interaction.commandName);
      if (owner) await owner.handleCommand(interaction);
      return;
    }
    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
      const owner = modules.find(m => m.ownsComponent?.(interaction.customId));
      if (owner) await owner.handleComponent(interaction);
      else if (interaction.isRepliable()) await interaction.reply({ content: "This button is no longer active.", ephemeral: true }).catch(() => {});
    }
  } catch (err) {
    console.error("Interaction error:", err);
    registerRateLimit(err);
    if (!interaction.isRepliable()) return;
    const content = `❌ ${describeError(err)}`;
    if (interaction.deferred) await interaction.editReply({ content }).catch(() => {});
    else if (!interaction.replied) await interaction.reply({ content, ephemeral: true }).catch(() => {});
    else await interaction.followUp({ content, ephemeral: true }).catch(() => {});
  }
});

client.on("error", err => console.error("Discord client error:", err?.message || err));
client.on("shardError", err => console.error("Discord shard error:", err?.message || err));
process.on("unhandledRejection", err => console.error("Unhandled rejection:", err));
process.on("uncaughtException", err => console.error("Uncaught exception:", err));

client.login(cfg.TOKEN).catch(err => {
  if (/disallowed intents/i.test(err?.message || "")) {
    console.error("Login failed: enable SERVER MEMBERS INTENT and MESSAGE CONTENT INTENT in the Discord Developer Portal (Bot → Privileged Gateway Intents), then restart.");
  } else console.error("Login failed:", err?.message || err);
  process.exit(1);
});
