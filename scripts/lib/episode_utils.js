const fs = require("fs");
const path = require("path");

const SKIP_DIRS = new Set(["glossary", "reference"]);
const AUDIO_NAMES = ["audio.mp3", "audio.m4a", "audio.ogg", "audio.wav"];

const isEpisodeFolderName = (name) => {
  if (!name || name.startsWith(".") || name.startsWith("_")) return false;
  if (SKIP_DIRS.has(name.toLowerCase())) return false;
  return true;
};

const listEpisodeFolders = (episodesDir) => {
  if (!fs.existsSync(episodesDir)) return [];

  return fs
    .readdirSync(episodesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isEpisodeFolderName(entry.name))
    .filter((entry) => fs.existsSync(path.join(episodesDir, entry.name, "text.md")))
    .map((entry) => path.join(episodesDir, entry.name));
};

const findAudio = (folder) => {
  for (const name of AUDIO_NAMES) {
    const candidate = path.join(folder, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

const stripInline = (text) => String(text || "")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/\*([^*]+)\*/g, "$1")
  .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1");

const isListLine = (line) => /^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());

const parseMarkdown = (md) => {
  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html = [];

  blocks.forEach((block) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const lines = trimmed.split("\n");
    if (lines.every((line) => isListLine(line))) {
      const ordered = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${lines.map((line) => {
        const text = line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
        return `<li>${stripInline(text)}</li>`;
      }).join("")}</${tag}>`);
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading && lines.length === 1) {
      html.push(`<h${heading[1].length}>${stripInline(heading[2])}</h${heading[1].length}>`);
      return;
    }

    html.push(`<p>${stripInline(lines.join("<br>"))}</p>`);
  });

  return html.join("");
};

const mergeOrphanPunctuation = (words) => {
  const merged = [];
  words.forEach((word) => {
    if (merged.length && (/^[.,;:!?)\]}"'»«]+$/.test(word) || /^[—–-]\S*$/.test(word))) {
      merged[merged.length - 1] += word;
      return;
    }
    merged.push(word);
  });
  return merged;
};

const episodeNumber = (episode) => {
  const match = String(episode?.id || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

/** Newest episode first (ep3, ep2, ep1 left → right on the main page). */
const compareEpisodes = (a, b) => {
  if (a.date && b.date && a.date !== b.date) {
    return b.date.localeCompare(a.date);
  }
  const diff = episodeNumber(b) - episodeNumber(a);
  if (diff !== 0) return diff;
  return String(b.id || "").localeCompare(String(a.id || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

const sortEpisodes = (episodes) => [...episodes].sort(compareEpisodes);

const extractDomWords = (md) => {
  const text = parseMarkdown(md)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return mergeOrphanPunctuation(text.match(/\S+/g) || []);
};

module.exports = {
  SKIP_DIRS,
  AUDIO_NAMES,
  isEpisodeFolderName,
  listEpisodeFolders,
  findAudio,
  extractDomWords,
  parseMarkdown,
  compareEpisodes,
  sortEpisodes,
};
