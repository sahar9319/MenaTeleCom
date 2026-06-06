#!/usr/bin/env python3
"""Generate word-level timing.json from audio using Whisper, aligned to episode text."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "episodes"
AUDIO_NAMES = ["audio.mp3", "audio.m4a", "audio.ogg", "audio.wav"]


def strip_inline(text: str) -> str:
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text


def is_list_line(line: str) -> bool:
    trimmed = line.strip()
    return bool(re.match(r"^[-*]\s+", trimmed) or re.match(r"^\d+\.\s+", trimmed))


def parse_markdown(md: str) -> str:
    blocks = md.replace("\r\n", "\n").split("\n\n")
    html = []

    for block in blocks:
        trimmed = block.strip()
        if not trimmed:
            continue

        lines = trimmed.split("\n")
        if all(is_list_line(line) for line in lines):
            ordered = all(re.match(r"^\d+\.\s+", line.strip()) for line in lines)
            tag = "ol" if ordered else "ul"
            items = []
            for line in lines:
                text = re.sub(r"^[-*]\s+", "", line.strip())
                text = re.sub(r"^\d+\.\s+", "", text)
                items.append(f"<li>{strip_inline(text)}</li>")
            html.append(f"<{tag}>{''.join(items)}</{tag}>")
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", trimmed)
        if heading and len(lines) == 1:
            html.append(f"<h{len(heading.group(1))}>{strip_inline(heading.group(2))}</h{len(heading.group(1))}>")
            continue

        html.append(f"<p>{strip_inline('<br>'.join(lines))}</p>")

    return "".join(html)


def merge_orphan_punctuation(words: list[str]) -> list[str]:
    merged = []
    for word in words:
        if merged and re.fullmatch(r"[.,;:!?)\]}\"'»«]+", word):
            merged[-1] += word
            continue
        merged.append(word)
    return merged


def extract_dom_words(md: str) -> list[str]:
    text = parse_markdown(md)
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return merge_orphan_punctuation(re.findall(r"\S+", text))


def normalize_token(word: str) -> str:
    cleaned = re.sub(r"^[—–-]+", "", word)
    return re.sub(r"[^\w]", "", cleaned.lower())


def score_match(script_word: str, whisper_word: str) -> int:
    script = normalize_token(script_word)
    whisper = normalize_token(whisper_word)
    if not script and not whisper:
        return 0
    if script == whisper:
        return 100
    if script and whisper and (whisper.startswith(script) or script.startswith(whisper)):
        return 85
    if script and whisper and (script in whisper or whisper in script):
        return 65
    bare = re.sub(r"^[^\w]+", "", script_word)
    if bare and bare.lower() in whisper_word.lower():
        return 55
    return 0


def get_audio_duration(audio_path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(audio_path),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


def find_audio(folder: Path) -> Path | None:
    for name in AUDIO_NAMES:
        candidate = folder / name
        if candidate.exists():
            return candidate
    return None


def transcribe_words(model: WhisperModel, audio_path: Path) -> list[dict]:
    segments, _ = model.transcribe(
        str(audio_path),
        word_timestamps=True,
        vad_filter=True,
        language="en",
        beam_size=1,
        best_of=1,
        temperature=0,
        condition_on_previous_text=False,
        without_timestamps=False,
    )

    words = []
    for segment in segments:
        if not segment.words:
            continue
        for item in segment.words:
            token = (item.word or "").strip()
            if not token:
                continue
            words.append(
                {
                    "word": token,
                    "start": round(float(item.start), 3),
                    "end": round(float(item.end), 3),
                }
            )
    return words


def interpolate_timing_gaps(timing: list[dict], duration: float) -> list[dict]:
    if not timing:
        return timing

    anchors = [
        index
        for index, item in enumerate(timing)
        if item["end"] > item["start"] + 0.02
    ]
    if not anchors:
        return fallback_weighted([item["word"] for item in timing], duration)

    for anchor_pos in range(len(anchors) - 1):
        start_idx = anchors[anchor_pos]
        end_idx = anchors[anchor_pos + 1]
        gap_count = end_idx - start_idx
        if gap_count <= 1:
            continue

        span_start = timing[start_idx]["end"]
        span_end = max(span_start + 0.05, timing[end_idx]["start"])
        slice_len = (span_end - span_start) / gap_count
        cursor = span_start
        for index in range(start_idx + 1, end_idx):
            cursor += slice_len
            timing[index]["start"] = round(max(span_start, cursor - slice_len), 3)
            timing[index]["end"] = round(min(duration, cursor), 3)

    last_anchor = anchors[-1]
    trailing = len(timing) - last_anchor - 1
    if trailing > 0:
        span_start = timing[last_anchor]["end"]
        slice_len = max(0.05, (duration - span_start) / trailing)
        cursor = span_start
        for index in range(last_anchor + 1, len(timing)):
            timing[index]["start"] = round(cursor, 3)
            cursor += slice_len
            timing[index]["end"] = round(min(duration, cursor), 3)

    for index in range(1, len(timing)):
        if timing[index]["start"] < timing[index - 1]["end"]:
            timing[index]["start"] = round(timing[index - 1]["end"], 3)
        if timing[index]["end"] <= timing[index]["start"]:
            timing[index]["end"] = round(min(duration, timing[index]["start"] + 0.08), 3)

    timing[-1]["end"] = round(min(duration, max(timing[-1]["end"], timing[-1]["start"] + 0.06)), 3)
    return timing


def align_words(script_words: list[str], whisper_words: list[dict], duration: float) -> list[dict]:
    if not script_words:
        return []

    if not whisper_words:
        return fallback_weighted(script_words, duration)

    timing = []
    search_from = 0
    last_end = 0.0

    for script_word in script_words:
        best_index = None
        best_score = 0
        search_end = min(len(whisper_words), search_from + 15)

        for index in range(search_from, search_end):
            score = score_match(script_word, whisper_words[index]["word"])
            if score > best_score:
                best_score = score
                best_index = index

        if best_index is not None and best_score >= 55:
            stamp = whisper_words[best_index]
            timing.append(
                {
                    "word": script_word,
                    "start": stamp["start"],
                    "end": max(stamp["end"], stamp["start"] + 0.04),
                }
            )
            last_end = timing[-1]["end"]
            search_from = best_index + 1
            continue

        if best_index is not None and best_score >= 40:
            stamp = whisper_words[best_index]
            timing.append(
                {
                    "word": script_word,
                    "start": stamp["start"],
                    "end": max(stamp["end"], stamp["start"] + 0.04),
                }
            )
            last_end = timing[-1]["end"]
            continue

        if timing:
            previous = timing[-1]
            timing.append(
                {
                    "word": script_word,
                    "start": previous["start"],
                    "end": previous["end"],
                }
            )
            continue

        estimated_end = min(duration, last_end + 0.15)
        timing.append({"word": script_word, "start": last_end, "end": estimated_end})
        last_end = estimated_end

    return interpolate_timing_gaps(timing, duration)


def fallback_weighted(words: list[str], duration: float) -> list[dict]:
    weights = []
    for word in words:
        core = re.sub(r"[^\w]", "", word) or word
        weight = max(1, len(core))
        if re.search(r"[.!?][\"']?$", word):
            weight *= 2.2
        weights.append(weight)

    total = sum(weights) or 1
    cursor = 0.0
    timing = []
    for word, weight in zip(words, weights):
        slice_len = (weight / total) * duration
        start = cursor
        cursor += slice_len
        timing.append({"word": word, "start": round(start, 3), "end": round(min(duration, cursor), 3)})
    return timing


def main() -> int:
    if not EPISODES.exists():
        print("No episodes/ folder found.", file=sys.stderr)
        return 1

    model_name = sys.argv[1] if len(sys.argv) > 1 else "tiny"
    cpu_threads = max(2, (os.cpu_count() or 4) - 1)
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if token:
        os.environ.setdefault("HF_TOKEN", token)
        os.environ.setdefault("HUGGING_FACE_HUB_TOKEN", token)

    print(f"Loading Whisper model ({model_name}, {cpu_threads} threads)...", flush=True)
    model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=cpu_threads)

    wrote = 0
    for folder in sorted(EPISODES.iterdir()):
        if not folder.is_dir() or not (folder / "text.md").exists():
            continue

        audio_path = find_audio(folder)
        if not audio_path:
            print(f"Skipping {folder.name}: no audio")
            continue

        text = (folder / "text.md").read_text(encoding="utf-8")
        script_words = extract_dom_words(text)
        print(f"Transcribing {folder.name}...", flush=True)
        whisper_words = transcribe_words(model, audio_path)
        duration = get_audio_duration(audio_path) or (whisper_words[-1]["end"] if whisper_words else 0.0)
        timing = align_words(script_words, whisper_words, duration)

        output = folder / "timing.json"
        output.write_text(f"{json.dumps(timing, indent=2)}\n", encoding="utf-8")
        wrote += 1
        matched = sum(
            1
            for index, word in enumerate(script_words)
            if index < len(whisper_words)
            and normalize_token(word) == normalize_token(whisper_words[min(index, len(whisper_words) - 1)]["word"])
        )
        print(
            f"{folder.name}: {len(timing)} words, "
            f"{len(whisper_words)} transcribed, "
            f"{duration:.1f}s",
            flush=True,
        )

    if not wrote:
        print("No timing files generated.", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
