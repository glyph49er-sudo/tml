// Daily Mystery Box. One roll per Discord user per Pacific calendar day
// (America/Los_Angeles, DST-aware). The roll is written to disk BEFORE the
// user sees it, so restarts or double-clicks can never grant a second roll.
const crypto = require("node:crypto");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const { readJson, writeJson } = require("./store");
const { isAdmin, chunkLines } = require("./util");
const cfg = require("./config");

// Weights are stored in tenths of a percent (integers) so the total is exactly
// 1000 = 100.0% with no floating-point rounding.
const MYSTERY_BOX_REWARDS = [
  { reward: "Ball Carrier Vision", tenths: 236 },
  { reward: "Carrying", tenths: 236 },
  { reward: "Kick Return", tenths: 236 },

  { reward: "+1 Speed", tenths: 5 },
  { reward: "+1 Acceleration", tenths: 20 },
  { reward: "+1 Agility", tenths: 20 },
  { reward: "+1 Awareness", tenths: 20 },
  { reward: "+1 Strength", tenths: 20 },
  { reward: "+1 Jumping", tenths: 20 },
  { reward: "+1 Change of Direction", tenths: 20 },
  { reward: "+1 Throw Power", tenths: 20 },
  { reward: "+1 Short Accuracy", tenths: 20 },
  { reward: "+1 Medium Accuracy", tenths: 20 },
  { reward: "+1 Deep Accuracy", tenths: 20 },
  { reward: "+1 Catching", tenths: 20 },
  { reward: "+1 Carrying", tenths: 20 },
  { reward: "+1 Tackling", tenths: 20 },
  { reward: "+1 Play Recognition", tenths: 20 },

  { reward: "Normal → Star", tenths: 5 },
  { reward: "Star → Superstar", tenths: 1 },
  { reward: "Superstar → X-Factor", tenths: 1 }
];
const TOTAL_TENTHS = MYSTERY_BOX_REWARDS.reduce((t, r) => t + r.tenths, 0);
if (TOTAL_TENTHS !== 1000) throw new Error(`Mystery Box probabilities total ${TOTAL_TENTHS / 10}%, not 100%.`);

function rollMysteryBox(randomInt = crypto.randomInt) {
  let roll = randomInt(1000); // 0..999, uniform
  for (const item of MYSTERY_BOX_REWARDS) {
    roll -= item.tenths;
    if (roll < 0) return item.reward;
  }
  return MYSTERY_BOX_REWARDS[MYSTERY_BOX_REWARDS.length - 1].reward;
}

// "YYYY-MM-DD" for the Pacific calendar day of `date`.
function pacificDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: cfg.TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const data = readJson("mysteryBox", { claims: {}, history: [], hiddenToday: {} });
// claims[userId] = { date, reward, player, rolledAt, playerSetAt, historyIndex }
const save = () => writeJson("mysteryBox", data);

const checkerSessions = new Map();

// Pure: decides and records a roll. Returns { already, claim }.
function claimDaily(userId, username, now = new Date(), roll = rollMysteryBox) {
  const today = pacificDate(now);
  const existing = data.claims[userId];
  if (existing && existing.date === today) return { already: true, claim: existing };
  const claim = { date: today, reward: roll(), player: null, rolledAt: now.toISOString(), playerSetAt: null, username };
  data.history.push({ userId, username, date: today, reward: claim.reward, player: null, rolledAt: claim.rolledAt });
  claim.historyIndex = data.history.length - 1;
  data.claims[userId] = claim;
  save(); // persisted before the user is told anything
  return { already: false, claim };
}

function setPlayer(userId, date, player) {
  const claim = data.claims[userId];
  if (!claim || claim.date !== date) return null;
  claim.player = player; claim.playerSetAt = new Date().toISOString();
  const h = data.history[claim.historyIndex];
  if (h && h.userId === userId && h.date === date) { h.player = player; h.playerSetAt = claim.playerSetAt; }
  save();
  return claim;
}

const applyButton = date => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`mbox_apply:${date}`).setLabel("Enter player name").setStyle(ButtonStyle.Success));

const COMMAND_NAMES = ["mystery-box-post", "mystery-box-checker"];

async function handleCommand(i) {
  if (!isAdmin(i)) return i.reply({ content: "You must be an administrator to use this command.", ephemeral: true });
  if (i.commandName === "mystery-box-post") {
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("mbox_roll").setLabel("Roll").setEmoji("🎁").setStyle(ButtonStyle.Primary));
    await i.channel.send({ content: "roll your daily trait!", components: [row] });
    return i.reply({ content: "Mystery Box posted.", ephemeral: true });
  }
  if (i.commandName === "mystery-box-checker") {
    const user = i.options.getUser("user");
    const date = i.options.getString("date");
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return i.reply({ content: "Date must look like 2026-11-12.", ephemeral: true });
    const today = pacificDate();
    const hiddenIds = new Set((data.hiddenToday && data.hiddenToday[today]) || []);
    let rows = data.history.filter(h =>
      (!user || h.userId === user.id) &&
      (!date || h.date === date) &&
      !(h.date === today && hiddenIds.has(h.userId))
    );
    if (!rows.length) return i.reply({ content: "No pending Mystery Box rewards match that search.", ephemeral: true });
    rows = rows.slice().reverse();
    const shownIds = [...new Set(rows.map(h => h.userId))];
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    checkerSessions.set(sessionId, { day: today, userIds: shownIds, at: Date.now() });
    for (const [k, v] of checkerSessions.entries()) if (Date.now() - v.at > 86400000) checkerSessions.delete(k);

    const lines = rows.map(h => `\`${h.date}\` <@${h.userId}> — **${h.reward}** → ${h.player ? `*${h.player}*` : "_no player entered yet_"}`);
    const chunks = chunkLines(`🎁 **Mystery Box rewards** (${rows.length}, newest first)\n\n`, lines);
    const givenRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mbox_given:${sessionId}`).setLabel("Given").setStyle(ButtonStyle.Success)
    );
    const totalChunks = Math.min(chunks.length, 10);
    await i.reply({
      content: chunks[0],
      components: totalChunks === 1 ? [givenRow] : [],
      ephemeral: true,
      allowedMentions: { parse: [] }
    });
    for (let idx = 1; idx < totalChunks; idx++) {
      const isLast = idx === totalChunks - 1;
      await i.followUp({
        content: chunks[idx],
        components: isLast ? [givenRow] : [],
        ephemeral: true,
        allowedMentions: { parse: [] }
      });
    }
    return;
  }
}

const ownsComponent = id => id === "mbox_roll" || id.startsWith("mbox_apply:") || id.startsWith("mbox_modal:") || id.startsWith("mbox_given:");

async function handleComponent(i) {
  if (i.customId.startsWith("mbox_given:")) {
    if (!isAdmin(i)) return i.reply({ content: "You must be an administrator to use this button.", ephemeral: true });
    const sessionId = i.customId.split(":")[1];
    const session = checkerSessions.get(sessionId);
    if (!session) return i.reply({ content: "This list session has expired or was already marked as given.", ephemeral: true });
    const day = session.day || pacificDate();
    if (!data.hiddenToday || typeof data.hiddenToday !== "object") data.hiddenToday = {};
    const existing = new Set(data.hiddenToday[day] || []);
    for (const uid of session.userIds) existing.add(uid);
    data.hiddenToday[day] = [...existing];
    for (const k of Object.keys(data.hiddenToday)) if (k !== day) delete data.hiddenToday[k];
    save();
    checkerSessions.delete(sessionId);
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`mbox_given_done:${sessionId}`).setLabel("Given ✓").setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    return i.update({
      content: `${i.message.content}\n\n✅ **Marked as Given** — These users are cleared from today's list.`,
      components: [disabledRow]
    });
  }
  if (i.customId === "mbox_roll") {
    const { already, claim } = claimDaily(i.user.id, i.user.username);
    if (already) {
      if (!claim.player) return i.reply({ content: `You already rolled today and got **${claim.reward}**. Who will you apply it to?`, components: [applyButton(claim.date)], ephemeral: true });
      return i.reply({ content: `You already rolled today: **${claim.reward}** → *${claim.player}*. Come back after midnight Pacific time!`, ephemeral: true });
    }
    return i.reply({ content: `Congratulations! You got **${claim.reward}**! Who will you apply it to?`, components: [applyButton(claim.date)], ephemeral: true });
  }
  if (i.customId.startsWith("mbox_apply:")) {
    const date = i.customId.split(":")[1];
    const claim = data.claims[i.user.id];
    if (!claim || claim.date !== date) return i.reply({ content: "That roll has expired — roll again today from the Mystery Box post.", ephemeral: true });
    if (claim.player) return i.reply({ content: `You already applied **${claim.reward}** to *${claim.player}*.`, ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`mbox_modal:${date}`).setTitle("Apply your Mystery Box reward").addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("player").setLabel(`Player for ${claim.reward}`.slice(0, 45)).setPlaceholder("Player name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(60))
    );
    return i.showModal(modal);
  }
  if (i.customId.startsWith("mbox_modal:")) {
    const date = i.customId.split(":")[1];
    const player = String(i.fields.getTextInputValue("player") || "").replace(/[*_~`|]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (!player) return i.reply({ content: "Please enter a player name.", ephemeral: true });
    const existing = data.claims[i.user.id];
    if (existing?.date === date && existing.player) return i.reply({ content: `You already applied **${existing.reward}** to *${existing.player}*.`, ephemeral: true });
    const claim = setPlayer(i.user.id, date, player);
    if (!claim) return i.reply({ content: "That roll has expired, so the player wasn't saved.", ephemeral: true });
    return i.reply({ content: `✅ Saved: **${claim.reward}** → *${player}*. See you tomorrow!`, ephemeral: true });
  }
  return false;
}

module.exports = { COMMAND_NAMES, handleCommand, handleComponent, ownsComponent, MYSTERY_BOX_REWARDS, TOTAL_TENTHS, rollMysteryBox, pacificDate, claimDaily, setPlayer, _data: data };
