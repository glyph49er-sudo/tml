// TML Bot — all 32 NFL teams.
// NOTE: The original Team Claimer teams.js was not provided, so this file was
// rebuilt from the Team Claimer index.js (which reads team.name, team.emoji and
// team.conference) and the FDL bot's team table (full names + abbreviations).
// `emoji` is a ":name:" placeholder resolved to a matching custom server emoji
// when one exists (same behavior as the Team Claimer's resolveGuildEmoji).
const TEAMS = [
  // AFC North
  { name: "Ravens", fullName: "Baltimore Ravens", abbr: "BAL", conference: "AFC", division: "North", emoji: ":ravens:" },
  { name: "Bengals", fullName: "Cincinnati Bengals", abbr: "CIN", conference: "AFC", division: "North", emoji: ":bengals:" },
  { name: "Browns", fullName: "Cleveland Browns", abbr: "CLE", conference: "AFC", division: "North", emoji: ":browns:" },
  { name: "Steelers", fullName: "Pittsburgh Steelers", abbr: "PIT", conference: "AFC", division: "North", emoji: ":steelers:" },
  // AFC East
  { name: "Bills", fullName: "Buffalo Bills", abbr: "BUF", conference: "AFC", division: "East", emoji: ":bills:" },
  { name: "Dolphins", fullName: "Miami Dolphins", abbr: "MIA", conference: "AFC", division: "East", emoji: ":dolphins:" },
  { name: "Patriots", fullName: "New England Patriots", abbr: "NE", conference: "AFC", division: "East", emoji: ":patriots:" },
  { name: "Jets", fullName: "New York Jets", abbr: "NYJ", conference: "AFC", division: "East", emoji: ":jets:" },
  // AFC South
  { name: "Texans", fullName: "Houston Texans", abbr: "HOU", conference: "AFC", division: "South", emoji: ":texans:" },
  { name: "Colts", fullName: "Indianapolis Colts", abbr: "IND", conference: "AFC", division: "South", emoji: ":colts:" },
  { name: "Jaguars", fullName: "Jacksonville Jaguars", abbr: "JAX", conference: "AFC", division: "South", emoji: ":jaguars:" },
  { name: "Titans", fullName: "Tennessee Titans", abbr: "TEN", conference: "AFC", division: "South", emoji: ":titans:" },
  // AFC West
  { name: "Broncos", fullName: "Denver Broncos", abbr: "DEN", conference: "AFC", division: "West", emoji: ":broncos:" },
  { name: "Chiefs", fullName: "Kansas City Chiefs", abbr: "KC", conference: "AFC", division: "West", emoji: ":chiefs:" },
  { name: "Raiders", fullName: "Las Vegas Raiders", abbr: "LV", conference: "AFC", division: "West", emoji: ":raiders:" },
  { name: "Chargers", fullName: "Los Angeles Chargers", abbr: "LAC", conference: "AFC", division: "West", emoji: ":chargers:" },
  // NFC East
  { name: "Cowboys", fullName: "Dallas Cowboys", abbr: "DAL", conference: "NFC", division: "East", emoji: ":cowboys:" },
  { name: "Giants", fullName: "New York Giants", abbr: "NYG", conference: "NFC", division: "East", emoji: ":giants:" },
  { name: "Eagles", fullName: "Philadelphia Eagles", abbr: "PHI", conference: "NFC", division: "East", emoji: ":eagles:" },
  { name: "Commanders", fullName: "Washington Commanders", abbr: "WAS", conference: "NFC", division: "East", emoji: ":commanders:" },
  // NFC North
  { name: "Bears", fullName: "Chicago Bears", abbr: "CHI", conference: "NFC", division: "North", emoji: ":bears:" },
  { name: "Lions", fullName: "Detroit Lions", abbr: "DET", conference: "NFC", division: "North", emoji: ":lions:" },
  { name: "Packers", fullName: "Green Bay Packers", abbr: "GB", conference: "NFC", division: "North", emoji: ":packers:" },
  { name: "Vikings", fullName: "Minnesota Vikings", abbr: "MIN", conference: "NFC", division: "North", emoji: ":vikings:" },
  // NFC South
  { name: "Falcons", fullName: "Atlanta Falcons", abbr: "ATL", conference: "NFC", division: "South", emoji: ":falcons:" },
  { name: "Panthers", fullName: "Carolina Panthers", abbr: "CAR", conference: "NFC", division: "South", emoji: ":panthers:" },
  { name: "Saints", fullName: "New Orleans Saints", abbr: "NO", conference: "NFC", division: "South", emoji: ":saints:" },
  { name: "Buccaneers", fullName: "Tampa Bay Buccaneers", abbr: "TB", conference: "NFC", division: "South", emoji: ":buccaneers:" },
  // NFC West
  { name: "Cardinals", fullName: "Arizona Cardinals", abbr: "ARI", conference: "NFC", division: "West", emoji: ":cardinals:" },
  { name: "Rams", fullName: "Los Angeles Rams", abbr: "LAR", conference: "NFC", division: "West", emoji: ":rams:" },
  { name: "49ers", fullName: "San Francisco 49ers", abbr: "SF", conference: "NFC", division: "West", emoji: ":49ers:" },
  { name: "Seahawks", fullName: "Seattle Seahawks", abbr: "SEA", conference: "NFC", division: "West", emoji: ":seahawks:" }
];

// Extra abbreviations seen in score feeds (from the FDL bot's alias table).
const EXTRA_ALIASES = {
  Packers: ["GNB"], Jaguars: ["JAC"], Chiefs: ["KAN"], Raiders: ["LVR", "OAK"], Patriots: ["NWE"],
  Saints: ["NOS"], "49ers": ["SFO", "Niners"], Buccaneers: ["TAM", "Bucs"], Commanders: ["WSH"]
};

function teamAliases(team) {
  return [team.fullName, team.name, team.abbr, ...(EXTRA_ALIASES[team.name] || [])];
}

function findTeam(input) {
  const s = String(input || "").trim().toLowerCase();
  if (!s) return null;
  return TEAMS.find(t => teamAliases(t).some(a => a.toLowerCase() === s)) || null;
}

if (TEAMS.length !== 32) throw new Error(`teams.js must contain 32 teams, found ${TEAMS.length}`);

module.exports = { TEAMS, teamAliases, findTeam };
