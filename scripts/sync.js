#!/usr/bin/env node
/**
 * Full sync pipeline — one command updates everything:
 *   speech (Edge TTS) → line timing (Whisper) → episodes.json
 *
 * Users never create audio.mp3, timing.json, or voice/avatar metadata by hand.
 *
 * Usage:
 *   node scripts/sync.js                  # full auto sync (default)
 *   node scripts/sync.js --force-speech     # regenerate all narration
 *   node scripts/sync.js --no-speech        # timing + manifest only (manual audio)
 *   node scripts/sync.js --timing-only      # timing only, no manifest
 *   node scripts/sync.js tiny               # Whisper model (default: tiny)
 */

const { spawnSync } = require("child_process");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const args = process.argv.slice(2);

const skipSpeech = args.includes("--no-speech");
const forceSpeech = args.includes("--force-speech");
const timingOnly = args.includes("--timing-only");
const model = args.find((arg) => !arg.startsWith("--")) || "tiny";

const run = (label, command, commandArgs, options = {}) => {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    cwd: rootDir,
    ...options,
  });
  if (result.status !== 0) {
    console.error(`✗ ${label} failed (exit ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
};

if (!skipSpeech) {
  const speechArgs = [path.join(__dirname, "generate_speech.js")];
  if (forceSpeech) speechArgs.push("--force");
  run("Generating narration from text (Edge TTS)", "node", speechArgs);
} else {
  run("Detecting voice for manual recordings", "node", [
    path.join(__dirname, "detect_voice.js"),
    "--skip-tts",
  ]);
}

run(`Generating line highlights (Whisper, ${model})`, "node", [
  path.join(__dirname, "generate_timing.js"),
  model,
]);

if (!timingOnly) {
  run("Updating episodes.json", "node", [path.join(__dirname, "generate_manifest.js")]);
}

console.log("\n✓ Sync complete — narration, highlights, voice, and avatar are ready.");
console.log("  Hard-refresh the browser if the dev server is already open.");
