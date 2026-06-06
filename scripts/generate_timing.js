#!/usr/bin/env node
/**
 * Generate timing.json for all episodes.
 * Prefers Whisper (generate_timing.py). Falls back to ffmpeg silence-aware estimation.
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { listEpisodeFolders, findAudio, extractDomWords } = require("./lib/episode_utils");

const rootDir = path.join(__dirname, "..");
const venvPython = path.join(rootDir, ".venv/bin/python");
const python = fs.existsSync(venvPython) ? venvPython : "python3";
const model = process.argv[2] || "tiny";

const runWhisper = () => {
  const result = spawnSync(python, [path.join(__dirname, "generate_timing.py"), model], {
    stdio: "inherit",
    cwd: rootDir,
  });
  return result.status === 0;
};

const wordWeight = (word) => {
  const core = word.replace(/[^\w]/g, "") || word;
  let weight = Math.max(1, core.length);
  if (/[.!?]["']?$/.test(word)) weight *= 2.2;
  else if (/[:,;]["']?$/.test(word)) weight *= 1.5;
  return weight;
};

const getAudioDuration = (audioPath) => {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: "utf8" }
    ).trim();
    const duration = Number(output);
    return Number.isFinite(duration) && duration > 0 ? duration : null;
  } catch (error) {
    return null;
  }
};

const buildWeightedTiming = (words, duration) => {
  if (!words.length || !duration) return [];

  const weights = words.map(wordWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;

  return words.map((word, index) => {
    const slice = (weights[index] / totalWeight) * duration;
    const start = cursor;
    cursor += slice;
    return {
      word,
      start: Number(start.toFixed(3)),
      end: Number(Math.min(duration, cursor).toFixed(3)),
    };
  });
};

const runFallback = () => {
  console.warn("Whisper unavailable — using weighted timing fallback (install .venv for better sync).\n");
  const episodesDir = path.join(rootDir, "episodes");
  let wrote = 0;

  listEpisodeFolders(episodesDir).forEach((folder) => {
    const audioPath = findAudio(folder);
    if (!audioPath) {
      console.warn(`Skipping ${path.basename(folder)}: no audio`);
      return;
    }

    const duration = getAudioDuration(audioPath);
    if (!duration) {
      console.warn(`Skipping ${path.basename(folder)}: ffprobe failed`);
      return;
    }

    const text = fs.readFileSync(path.join(folder, "text.md"), "utf8");
    const timing = buildWeightedTiming(extractDomWords(text), duration);
    fs.writeFileSync(path.join(folder, "timing.json"), `${JSON.stringify(timing, null, 2)}\n`, "utf8");
    wrote += 1;
    console.log(`${path.basename(folder)}: ${timing.length} words (estimated), ${duration.toFixed(1)}s`);
  });

  if (!wrote) {
    console.error("No timing files were generated.");
    process.exit(1);
  }
};

if (runWhisper()) {
  process.exit(0);
}

runFallback();
