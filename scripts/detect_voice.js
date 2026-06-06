const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { listEpisodeFolders, findAudio } = require("./lib/episode_utils");

const rootDir = path.join(__dirname, "..");
const episodesDir = path.join(rootDir, "episodes");
const glossaryPath = path.join(rootDir, "glossary.json");
const skipTts = process.argv.includes("--skip-tts");
const PITCH_THRESHOLD_HZ = 165;
const SAMPLE_RATE = 11025;
const ANALYZE_SECONDS = 24;

const readMeta = (folder) => {
  const metaPath = path.join(folder, "meta.json");
  if (!fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (error) {
    return {};
  }
};

const isTtsManaged = (meta) => (
  meta.voiceSource === "tts" || meta.tts === true
);

const readPcm = (audioPath) => {
  const result = spawnSync(
    "ffmpeg",
    ["-i", audioPath, "-t", String(ANALYZE_SECONDS), "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "pipe:1"],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 }
  );

  if (result.status !== 0 || !result.stdout?.length) {
    return null;
  }

  const buffer = result.stdout;
  const samples = new Float32Array(Math.floor(buffer.length / 2));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = buffer.readInt16LE(index * 2) / 32768;
  }
  return samples;
};

const autocorrelatePitch = (frame, sampleRate) => {
  const minLag = Math.floor(sampleRate / 340);
  const maxLag = Math.floor(sampleRate / 70);
  let bestLag = minLag;
  let bestCorr = -1;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0;
    for (let index = 0; index < frame.length - lag; index += 1) {
      corr += frame[index] * frame[index + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return sampleRate / bestLag;
};

const collectPitches = (samples) => {
  const frameSize = 2048;
  const pitches = [];

  for (let offset = 0; offset + frameSize < samples.length; offset += Math.floor(frameSize / 2)) {
    const frame = samples.subarray(offset, offset + frameSize);
    let rms = 0;
    for (let index = 0; index < frame.length; index += 1) {
      rms += frame[index] * frame[index];
    }
    rms = Math.sqrt(rms / frame.length);
    if (rms < 0.012) continue;

    const pitch = autocorrelatePitch(frame, SAMPLE_RATE);
    if (pitch >= 75 && pitch <= 400) {
      pitches.push(pitch);
    }
  }

  return pitches;
};

const classifyVoice = (pitches) => {
  if (!pitches.length) return "male";
  const sorted = [...pitches].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return median >= PITCH_THRESHOLD_HZ ? "female" : "male";
};

const detectVoiceFromFile = (audioPath) => {
  const samples = readPcm(audioPath);
  if (!samples) return { voice: "male", medianPitch: 0, confidence: "low" };

  const pitches = collectPitches(samples);
  const medianPitch = pitches.length
    ? pitches.sort((a, b) => a - b)[Math.floor(pitches.length / 2)]
    : 0;

  return {
    voice: classifyVoice(pitches),
    medianPitch: Number(medianPitch.toFixed(1)),
    confidence: pitches.length >= 12 ? "high" : pitches.length >= 4 ? "medium" : "low"
  };
};

const writeMetaVoice = (folder, voice) => {
  const metaPath = path.join(folder, "meta.json");
  const meta = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, "utf8"))
    : {};

  meta.voice = voice;
  meta.voiceSource = "detected";
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
};

let updated = 0;
let skippedTts = 0;

if (fs.existsSync(episodesDir)) {
  listEpisodeFolders(episodesDir).forEach((folder) => {
    const meta = readMeta(folder);
    if (skipTts && isTtsManaged(meta)) {
      skippedTts += 1;
      console.log(`${path.basename(folder)}: ${meta.voice} (TTS — skipped pitch detection)`);
      return;
    }

    const audioPath = findAudio(folder);
    if (!audioPath) return;

    const result = detectVoiceFromFile(audioPath);
    writeMetaVoice(folder, result.voice);
    updated += 1;
    console.log(
      `${path.basename(folder)}: ${result.voice} (~${result.medianPitch || "?"} Hz, ${result.confidence})`
    );
  });
}

if (fs.existsSync(glossaryPath)) {
  const glossary = JSON.parse(fs.readFileSync(glossaryPath, "utf8"));
  let glossaryChanged = false;

  glossary.forEach((entry) => {
    if (!entry.audio) return;
    if (skipTts && entry.voiceSource === "tts") return;

    const audioPath = path.join(rootDir, entry.audio);
    if (!fs.existsSync(audioPath)) return;

    const result = detectVoiceFromFile(audioPath);
    if (entry.voice !== result.voice) {
      entry.voice = result.voice;
      entry.voiceSource = "detected";
      glossaryChanged = true;
      console.log(`${entry.id}: ${result.voice} (~${result.medianPitch || "?"} Hz)`);
    }
  });

  if (glossaryChanged) {
    fs.writeFileSync(glossaryPath, `${JSON.stringify(glossary, null, 2)}\n`, "utf8");
    updated += 1;
  }
}

if (!updated && !skippedTts) {
  console.warn("No voices were detected. Install ffmpeg and ensure episode audio files exist.");
  process.exit(1);
}

if (!updated && skippedTts) {
  console.log(`All ${skippedTts} episode(s) use TTS voice metadata — no pitch detection needed.`);
}
