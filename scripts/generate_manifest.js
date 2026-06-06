const fs = require("fs");
const path = require("path");
const { buildEpisodesManifest } = require("./lib/episodes_manifest");

const rootDir = path.join(__dirname, "..");
const outputPath = path.join(rootDir, "episodes.json");

if (!fs.existsSync(path.join(rootDir, "episodes"))) {
  console.error("No episodes/ folder found. Create it first, then run this script again.");
  process.exit(1);
}

const manifest = buildEpisodesManifest(rootDir);

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${manifest.length} episodes to episodes.json`);
