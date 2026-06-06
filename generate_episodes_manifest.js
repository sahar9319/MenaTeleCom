const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const episodesDir = path.join(rootDir, "episodes");
const outputPath = path.join(rootDir, "episodes.json");
const imageNames = ["image.jpg", "image.jpeg", "image.png", "image.webp"];
const audioNames = ["audio.mp3", "audio.m4a", "audio.ogg", "audio.wav"];

const toRelative = (filePath) => path.relative(rootDir, filePath).replace(/\\/g, "/");

const findFirstExisting = (folder, names) => {
  for (const name of names) {
    const candidate = path.join(folder, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

const readMeta = (folder) => {
  const metaPath = path.join(folder, "meta.json");
  if (!fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (error) {
    console.warn(`Skipping invalid meta.json in ${path.basename(folder)}: ${error.message}`);
    return {};
  }
};

if (!fs.existsSync(episodesDir)) {
  console.error("No episodes/ folder found.");
  process.exit(1);
}

const manifest = fs.readdirSync(episodesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const folder = path.join(episodesDir, entry.name);
    const meta = readMeta(folder);
    const image = findFirstExisting(folder, imageNames) || path.join(folder, "image.jpg");
    const audio = findFirstExisting(folder, audioNames) || path.join(folder, "audio.mp3");
    const timing = path.join(folder, "timing.json");
    return {
      id: entry.name,
      title: meta.title || entry.name,
      date: meta.date || undefined,
      image: toRelative(image),
      text: toRelative(path.join(folder, "text.md")),
      audio: toRelative(audio),
      timing: fs.existsSync(timing) ? toRelative(timing) : undefined
    };
  })
  .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" })))
  .map((item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined)));

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${manifest.length} episodes to ${toRelative(outputPath)}`);
