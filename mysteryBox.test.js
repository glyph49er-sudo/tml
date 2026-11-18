require("./_setup");
const test = require("node:test"); const assert = require("node:assert");
const mb = require("../src/mysteryBox");

test("probabilities total exactly 100%", () => {
  assert.strictEqual(mb.TOTAL_TENTHS, 1000);
  const pct = Object.fromEntries(mb.MYSTERY_BOX_REWARDS.map(r => [r.reward, r.tenths / 10]));
  assert.strictEqual(pct["Ball Carrier Vision"], 23.6);
  assert.strictEqual(pct["Carrying"], 23.6);
  assert.strictEqual(pct["Kick Return"], 23.6);
  assert.strictEqual(pct["+1 Speed"], 0.5);
  assert.strictEqual(pct["+1 Play Recognition"], 2);
  assert.strictEqual(pct["Normal → Star"], 0.5);
  assert.strictEqual(pct["Star → Superstar"], 0.1);
  assert.strictEqual(pct["Superstar → X-Factor"], 0.1);
  assert.strictEqual(mb.MYSTERY_BOX_REWARDS.length, 21);
});

test("every roll value maps to the right reward", () => {
  const counts = {};
  for (let n = 0; n < 1000; n++) { const r = mb.rollMysteryBox(() => n); counts[r] = (counts[r] || 0) + 1; }
  for (const r of mb.MYSTERY_BOX_REWARDS) assert.strictEqual(counts[r.reward], r.tenths, r.reward);
});

test("Pacific day boundary uses America/Los_Angeles with DST", () => {
  // Summer (PDT, UTC-7): 06:59Z is still the previous day, 07:00Z is the new day
  assert.strictEqual(mb.pacificDate(new Date("2026-07-15T06:59:00Z")), "2026-07-14");
  assert.strictEqual(mb.pacificDate(new Date("2026-07-15T07:00:00Z")), "2026-07-15");
  // Winter (PST, UTC-8): 07:59Z previous day, 08:00Z new day
  assert.strictEqual(mb.pacificDate(new Date("2026-01-15T07:59:00Z")), "2026-01-14");
  assert.strictEqual(mb.pacificDate(new Date("2026-01-15T08:00:00Z")), "2026-01-15");
});

test("one roll per user per Pacific day, independent users, persisted", () => {
  const t1 = new Date("2026-11-12T20:00:00Z");
  const a = mb.claimDaily("u1", "one", t1, () => "Kick Return");
  assert.strictEqual(a.already, false);
  const b = mb.claimDaily("u1", "one", new Date("2026-11-13T07:59:00Z"), () => "Carrying"); // 23:59 PST same day
  assert.strictEqual(b.already, true);
  assert.strictEqual(b.claim.reward, "Kick Return");
  assert.strictEqual(mb.claimDaily("u2", "two", t1, () => "Carrying").already, false);
  // simulate restart: re-read file from disk
  const { readJson } = require("../src/store");
  const disk = readJson("mysteryBox", { claims: {}, history: [] });
  assert.strictEqual(disk.claims.u1.date, "2026-11-12");
  const c = mb.claimDaily("u1", "one", new Date("2026-11-13T08:00:00Z"), () => "Carrying"); // next Pacific day
  assert.strictEqual(c.already, false);
  assert.strictEqual(c.claim.reward, "Carrying");
});

test("player name is saved to the claim and history", () => {
  const claim = mb.claimDaily("u3", "three", new Date(), () => "+1 Speed");
  mb.setPlayer("u3", claim.claim.date, "Jane Doe");
  const h = mb._data.history.find(x => x.userId === "u3");
  assert.strictEqual(h.player, "Jane Doe");
  assert.strictEqual(mb._data.claims.u3.player, "Jane Doe");
});
