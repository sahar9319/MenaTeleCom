const fs = require("fs");
const path = require("path");
const { sortEpisodes } = require("./episode_utils");

const IMAGE_NAMES = ["image.jpg", "image.jpeg", "image.png", "image.webp"];
const AUDIO_NAMES = ["audio.mp3", "audio.m4a", "audio.ogg", "audio.wav"];
const AVATAR_NAMES = ["avatar.png", "avatar.jpg", "avatar.webp"];
const SKIP_DIRS = new Set(["glossary", "reference"]);

const toRelative = (rootDir, filePath) => path.relative(rootDir, filePath).replace(/\\/g, "/");

const findFirstExisting = (folder, names) => {
  for (const name of names) {
    const candidate = path.join(folder, name);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

const readMeta = (folder) => {
  const metaPath = path.join(folder, "meta.json");
  if (!fs.existsSync(metaPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (error) {
    console.warn(`Skipping invalid meta.json in ${path.basename(folder)}: ${error.message}`);
    return {};
  }
};

const isEpisodeFolder = (episodesDir, name) => {
  if (name.startsWith(".") || name.startsWith("_")) return false;
  if (SKIP_DIRS.has(name.toLowerCase())) return false;
  return fs.existsSync(path.join(episodesDir, name, "text.md"));
};

const buildEpisodesManifest = (rootDir) => {
  const episodesDir = path.join(rootDir, "episodes");
  if (!fs.existsSync(episodesDir)) {
    return [];
  }

  const episodes = fs
    .readdirSync(episodesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isEpisodeFolder(episodesDir, entry.name))
    .map((entry) => {
      const id = entry.name;
      const folder = path.join(episodesDir, id);
      const meta = readMeta(folder);
      const image = findFirstExisting(folder, IMAGE_NAMES);
      const audio = findFirstExisting(folder, AUDIO_NAMES);
      const avatar = findFirstExisting(folder, AVATAR_NAMES);
      const text = path.join(folder, "text.md");
      const timing = path.join(folder, "timing.json");

      const episode = {
        id: meta.id || id,
        title: meta.title || id,
        date: meta.date || undefined,
        image: image ? toRelative(rootDir, image) : undefined,
        text: toRelative(rootDir, text),
        audio: audio ? toRelative(rootDir, audio) : undefined,
        textUpdated: fs.statSync(text).mtimeMs,
      };

      if (image) {
        episode.imageUpdated = fs.statSync(image).mtimeMs;
      }
      if (audio) {
        episode.audioUpdated = fs.statSync(audio).mtimeMs;
      }

      if (meta.voiceOverride) {
        episode.voiceOverride = meta.voiceOverride;
      } else if (meta.voice) {
        episode.voice = meta.voice;
      }
      if (Number.isFinite(meta.avatarVariant)) {
        episode.avatarVariant = meta.avatarVariant;
      }
      if (avatar) {
        episode.avatar = toRelative(rootDir, avatar);
        episode.avatarMode = "photo";
      }
      if (fs.existsSync(timing)) {
        episode.timing = toRelative(rootDir, timing);
        episode.timingUpdated = fs.statSync(timing).mtimeMs;
      }

      return episode;
    });

  return sortEpisodes(
    episodes.map((episode) => {
      if (!episode.date) {
        delete episode.date;
      }
      if (!episode.image) {
        delete episode.image;
      }
      if (!episode.audio) {
        delete episode.audio;
      }
      return episode;
    }),
  );
};

module.exports = {
  buildEpisodesManifest,
  isEpisodeFolder,
};
