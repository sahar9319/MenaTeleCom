#!/usr/bin/env node
/**
 * Generate episode audio from text.md using Edge TTS (free Microsoft neural voices).
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const venvPython = path.join(rootDir, ".venv/bin/python");
const python = fs.existsSync(venvPython) ? venvPython : "python3";
const args = process.argv.slice(2);

const result = spawnSync(python, [path.join(__dirname, "generate_speech.py"), ...args], {
  stdio: "inherit",
  cwd: rootDir,
});

if (result.status !== 0) {
  console.error("\nSpeech generation failed.");
  console.error("Install dependencies: python3 -m venv .venv && source .venv/bin/activate && pip install edge-tts");
  process.exit(result.status ?? 1);
}
