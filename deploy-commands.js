// Run with: npm run deploy   (the bot also registers commands on every startup)
const { deployCommands } = require("./src/deploy");
deployCommands().then(n => console.log(`Registered ${n} slash commands to the TML server.`))
  .catch(err => { console.error("Command registration failed:", err?.message || err); process.exit(1); });
