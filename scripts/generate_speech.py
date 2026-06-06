#!/usr/bin/env python3
"""Generate episode audio from text.md using Microsoft Edge TTS (free, no API key)."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Missing edge-tts. Run: pip install edge-tts", file=sys.stderr)
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "episodes"
TTS_CONFIG_PATH = Path(__file__).resolve().parent / "tts_config.json"
SKIP_DIRS = {"glossary", "reference"}


def load_tts_config() -> dict:
    if TTS_CONFIG_PATH.exists():
        return json.loads(TTS_CONFIG_PATH.read_text(encoding="utf-8"))
    return {
        "defaultVoice": "female",
        "voices": {"male": "en-US-GuyNeural", "female": "en-US-JennyNeural"},
        "alternates": {},
        "rate": "+0%",
        "pitch": "+0Hz",
        "pauseBetweenParagraphsMs": 450,
    }


def is_episode_folder(name: str) -> bool:
    if not name or name.startswith(".") or name.startswith("_"):
        return False
    return name.lower() not in SKIP_DIRS


def read_meta(folder: Path) -> dict:
    meta_path = folder / "meta.json"
    if not meta_path.exists():
        return {}
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        print(f"Warning: invalid meta.json in {folder.name}: {error}", file=sys.stderr)
        return {}


def write_meta(folder: Path, meta: dict) -> None:
    (folder / "meta.json").write_text(f"{json.dumps(meta, indent=2)}\n", encoding="utf-8")


def strip_inline(text: str) -> str:
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text.strip()


def is_list_line(line: str) -> bool:
    trimmed = line.strip()
    return bool(re.match(r"^[-*]\s+", trimmed) or re.match(r"^\d+\.\s+", trimmed))


def markdown_to_paragraphs(md: str) -> list[str]:
    """Speakable paragraphs in the same reading order as the site."""
    paragraphs: list[str] = []

    for block in md.replace("\r\n", "\n").split("\n\n"):
        trimmed = block.strip()
        if not trimmed:
            continue

        lines = trimmed.split("\n")
        if all(is_list_line(line) for line in lines):
            for line in lines:
                text = re.sub(r"^[-*]\s+", "", line.strip())
                text = re.sub(r"^\d+\.\s+", "", text)
                spoken = strip_inline(text)
                if spoken:
                    paragraphs.append(spoken)
            continue

        if re.match(r"^#{1,3}\s+", trimmed) and len(lines) == 1:
            spoken = strip_inline(re.sub(r"^#{1,3}\s+", "", trimmed))
            if spoken:
                paragraphs.append(spoken)
            continue

        spoken = strip_inline(" ".join(line.strip() for line in lines if line.strip()))
        if spoken:
            paragraphs.append(spoken)

    return paragraphs


def voice_pool(config: dict, gender: str) -> list[str]:
    primary = config.get("voices", {}).get(gender)
    alternates = config.get("alternates", {}).get(gender, [])
    pool = [voice for voice in [primary, *alternates] if voice]
    return pool or ["en-US-JennyNeural"]


def gender_for_voice_id(voice_id: str, config: dict) -> str:
    male_pool = set(voice_pool(config, "male"))
    return "male" if voice_id in male_pool else "female"


def resolve_tts_voice(meta: dict, config: dict) -> tuple[str, str]:
    gender = meta.get("voiceOverride") or meta.get("voice") or config.get("defaultVoice", "female")
    if gender not in ("male", "female"):
        gender = "female"

    pool = voice_pool(config, gender)
    variant = int(meta.get("avatarVariant") or 0)
    voice_id = pool[variant % len(pool)]

    explicit = meta.get("ttsVoice")
    if explicit and gender_for_voice_id(explicit, config) == gender:
        voice_id = explicit

    return voice_id, gender


def needs_voice_regeneration(meta: dict, config: dict) -> bool:
    if meta.get("tts") is False:
        return False

    desired_id, desired_gender = resolve_tts_voice(meta, config)

    if meta.get("voiceSource") != "tts":
        return True
    if meta.get("voice") != desired_gender:
        return True
    if meta.get("ttsVoice") != desired_id:
        return True
    return False


def uses_tts(meta: dict) -> bool:
    return meta.get("tts") is not False


def ensure_meta(folder: Path, config: dict) -> dict:
    meta_path = folder / "meta.json"
    meta = read_meta(folder)
    changed = False

    if not meta.get("title"):
        meta["title"] = folder.name
        changed = True
    if not meta.get("voice") and not meta.get("voiceOverride"):
        meta["voice"] = config.get("defaultVoice", "female")
        changed = True

    if changed or not meta_path.exists():
        write_meta(folder, meta)

    return meta


def should_generate(folder: Path, meta: dict, config: dict, force: bool) -> bool:
    text_path = folder / "text.md"
    audio_path = folder / "audio.mp3"

    if not text_path.exists():
        return False
    if meta.get("tts") is False:
        return False
    if force:
        return True
    if not audio_path.exists():
        return True
    if needs_voice_regeneration(meta, config):
        return True
    return text_path.stat().st_mtime > audio_path.stat().st_mtime


async def synthesize_segment(
    text: str,
    voice: str,
    rate: str,
    pitch: str,
    output_path: Path,
) -> None:
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(str(output_path))


def concat_mp3_segments(segment_paths: list[Path], output_path: Path, pause_ms: int) -> None:
    if not segment_paths:
        raise ValueError("No audio segments to concatenate")

    if len(segment_paths) == 1:
        segment_paths[0].replace(output_path)
        return

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        parts: list[Path] = []

        for index, segment in enumerate(segment_paths):
            parts.append(segment)
            if pause_ms > 0 and index < len(segment_paths) - 1:
                silence = tmp_path / f"pause_{index:03d}.mp3"
                silence_result = subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-f",
                        "lavfi",
                        "-i",
                        f"anullsrc=r=24000:cl=mono",
                        "-t",
                        str(pause_ms / 1000),
                        "-q:a",
                        "9",
                        str(silence),
                    ],
                    capture_output=True,
                    text=True,
                    check=False,
                )
                if silence_result.returncode == 0:
                    parts.append(silence)

        list_file = tmp_path / "concat.txt"
        list_file.write_text(
            "\n".join(f"file '{path.resolve()}'" for path in parts),
            encoding="utf-8",
        )

        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-c:a",
                "libmp3lame",
                "-q:a",
                "2",
                str(output_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "ffmpeg concat failed")


async def synthesize_episode(
    paragraphs: list[str],
    voice: str,
    rate: str,
    pitch: str,
    output_path: Path,
    pause_ms: int,
) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        segments: list[Path] = []

        for index, paragraph in enumerate(paragraphs):
            segment_path = tmp_path / f"seg_{index:03d}.mp3"
            await synthesize_segment(paragraph, voice, rate, pitch, segment_path)
            segments.append(segment_path)

        concat_mp3_segments(segments, output_path, pause_ms)


async def process_episode(
    folder: Path,
    config: dict,
    force: bool,
) -> bool:
    meta = ensure_meta(folder, config)
    if not should_generate(folder, meta, config, force):
        reason = "manual recording (tts: false)" if meta.get("tts") is False else "text and voice unchanged"
        print(f"Skipping {folder.name}: speech up to date ({reason})", flush=True)
        return False

    text = (folder / "text.md").read_text(encoding="utf-8")
    paragraphs = markdown_to_paragraphs(text)
    if not paragraphs:
        print(f"Skipping {folder.name}: no speakable text", flush=True)
        return False

    voice_id, gender = resolve_tts_voice(meta, config)
    rate = config.get("rate", "+0%")
    pitch = config.get("pitch", "+0Hz")
    pause_ms = int(config.get("pauseBetweenParagraphsMs", 450))
    output_path = folder / "audio.mp3"

    print(
        f"Synthesizing {folder.name}: {len(paragraphs)} paragraph(s), "
        f"{gender} ({voice_id})...",
        flush=True,
    )
    await synthesize_episode(paragraphs, voice_id, rate, pitch, output_path, pause_ms)

    meta["voice"] = gender
    meta["voiceSource"] = "tts"
    meta["tts"] = True
    meta["ttsVoice"] = voice_id
    write_meta(folder, meta)

    duration = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(output_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    dur_text = duration.stdout.strip() if duration.returncode == 0 else "?"
    print(f"{folder.name}: wrote audio.mp3 ({dur_text}s), voice={gender}", flush=True)
    return True


async def run(args: argparse.Namespace) -> int:
    if not EPISODES.exists():
        print("No episodes/ folder found.", file=sys.stderr)
        return 1

    config = load_tts_config()
    wrote = 0

    for folder in sorted(EPISODES.iterdir()):
        if not folder.is_dir() or not is_episode_folder(folder.name):
            continue
        if not (folder / "text.md").exists():
            continue
        if args.episode and folder.name != args.episode:
            continue

        if await process_episode(folder, config, args.force):
            wrote += 1

    if wrote == 0 and args.episode:
        print(f"No speech generated for {args.episode}.", file=sys.stderr)
        return 1

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate episode audio from text.md via Edge TTS")
    parser.add_argument("--force", action="store_true", help="Regenerate even when audio exists")
    parser.add_argument("--episode", help="Only process one episode folder (e.g. ep4)")
    args = parser.parse_args()
    return asyncio.run(run(args))


if __name__ == "__main__":
    raise SystemExit(main())
