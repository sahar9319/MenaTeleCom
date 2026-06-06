const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const episodesDir = path.join(rootDir, "episodes");
const audioNames = ["audio.mp3", "audio.m4a", "audio.ogg", "audio.wav"];

const stripInline = (text) => String(text || "")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/\*([^*]+)\*/g, "$1")
  .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1");

const inlineMarkdown = (text) => stripInline(text);

const parseMarkdown = (md) => {
  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html = [];

  blocks.forEach((block) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const lines = trimmed.split("\n");
    if (lines.every((line) => /^-\s+/.test(line.trim()))) {
      html.push(`<ul>${lines.map((line) => `<li>${inlineMarkdown(line.trim().replace(/^-\s+/, ""))}</li>`).join("")}</ul>`);
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    html.push(`<p>${inlineMarkdown(lines.join(" "))}</p>`);
  });

  return html.join("");
};

const extractDomWords = (md) => {
  const text = parseMarkdown(md).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.match(/\S+/g) || [];
};

const wordWeight = (word) => {
  const core = word.replace(/[^\w]/g, "") || word;
  let weight = Math.max(1, core.length);
  if (/[.!?]["']?$/.test(word)) weight *= 2.4;
  else if (/[:,;]["']?$/.test(word)) weight *= 1.6;
  else if (/^[-•]/.test(word)) weight *= 0.8;
  return weight;
};

const getAudioDuration = (audioPath) => {
  try {
    const output = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { encoding: "utf8" }
    ).trim();
    const duration = Number(output);
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch (error) {
    return null;
  }
};

const getSilenceIntervals = (audioPath) => {
  try {
    const output = execSync(
      `ffmpeg -i "${audioPath}" -af silencedetect=noise=-35dB:d=0.22 -f null - 2>&1`,
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );

    const silences = [];
    let pendingStart = null;

    output.split("\n").forEach((line) => {
      const startMatch = line.match(/silence_start:\s*([\d.]+)/);
      const endMatch = line.match(/silence_end:\s*([\d.]+)/);

      if (startMatch) {
        pendingStart = Number(startMatch[1]);
      }
      if (endMatch && pendingStart !== null) {
        silences.push({ start: pendingStart, end: Number(endMatch[1]) });
        pendingStart = null;
      }
    });

    return silences;
  } catch (error) {
    return [];
  }
};

const getSpeechSegments = (duration, silences) => {
  const segments = [];
  let cursor = 0;

  silences
    .filter((gap) => gap.end > gap.start)
    .sort((left, right) => left.start - right.start)
    .forEach((gap) => {
      if (gap.start > cursor + 0.04) {
        segments.push({ start: cursor, end: gap.start });
      }
      cursor = Math.max(cursor, gap.end);
    });

  if (cursor < duration - 0.04) {
    segments.push({ start: cursor, end: duration });
  }

  if (!segments.length) {
    segments.push({ start: 0, end: duration });
  }

  return segments;
};

const mapSpeechTimeToClock = (speechTime, segments) => {
  let remaining = Math.max(0, speechTime);

  for (const segment of segments) {
    const length = segment.end - segment.start;
    if (remaining <= length) {
      return segment.start + remaining;
    }
    remaining -= length;
  }

  return segments[segments.length - 1].end;
};

const buildSilenceAwareTiming = (text, duration, silences) => {
  const words = extractDomWords(text);
  if (!words.length || !duration) return [];

  const segments = getSpeechSegments(duration, silences);
  const speechDuration = segments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
  const weights = words.map(wordWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let speechCursor = 0;

  return words.map((word, index) => {
    const slice = (weights[index] / totalWeight) * speechDuration;
    const start = mapSpeechTimeToClock(speechCursor, segments);
    speechCursor += slice;
    const end = mapSpeechTimeToClock(speechCursor, segments);
    return {
      word,
      start: Number(start.toFixed(3)),
      end: Number(Math.min(duration, end).toFixed(3))
    };
  });
};

const findAudio = (folder) => {
  for (const name of audioNames) {
    const candidate = path.join(folder, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

if (!fs.existsSync(episodesDir)) {
  console.error("No episodes/ folder found.");
  process.exit(1);
}

let wrote = 0;
fs.readdirSync(episodesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(episodesDir, entry.name, "text.md")))
  .forEach((entry) => {
    const folder = path.join(episodesDir, entry.name);
    const textPath = path.join(folder, "text.md");
    const audioPath = findAudio(folder);
    if (!audioPath) {
      console.warn(`Skipping ${entry.name}: no audio file found`);
      return;
    }

    const duration = getAudioDuration(audioPath);
    if (!duration) {
      console.warn(`Skipping ${entry.name}: could not read audio duration (install ffprobe)`);
      return;
    }

    const text = fs.readFileSync(textPath, "utf8");
    const silences = getSilenceIntervals(audioPath);
    const timing = buildSilenceAwareTiming(text, duration, silences);
    const outputPath = path.join(folder, "timing.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(timing, null, 2)}\n`, "utf8");
    wrote += 1;
    console.log(
      `Wrote ${timing.length} timings to episodes/${entry.name}/timing.json (${duration.toFixed(1)}s, ${silences.length} silence gaps)`
    );
  });

if (!wrote) {
  console.error("No timing files were generated.");
  process.exit(1);
}
