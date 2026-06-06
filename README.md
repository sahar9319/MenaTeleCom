# MENA Telecom Research Episodes

A single-page static website for sharing research episodes with images, Markdown notes, and audio recordings.

## Project Structure

```text
MenaTeleCom/
  index.html              # Page shell
  config.json             # Site copy, colors, labels, asset paths
  episodes.json           # Episode manifest (generated)
  glossary.json           # Glossary entries
  assets/
    css/styles.css        # Styles
    js/app.js             # Application logic
    images/               # Logo, flag, favicon, hero icons, avatar fallback
    icons/
      ui/                 # Play, pause, mute, quick-view
      telecom/            # Glossary tile icons
  episodes/
    ep1/                  # One folder per episode
      meta.json           # Optional title and date
      image.png           # Replace to change episode cover
      text.md
      audio.mp3
      avatar.png          # Replace to change episode avatar
  glossary/
    g1/                   # Optional audio.mp3 per glossary entry
  reference/
    glossary/             # Source reference data (not served as episodes)
  scripts/
    serve.js              # Local server — auto-discovers episodes (use this)
    generate_manifest.js  # Build episodes.json for static deploy
    lib/episodes_manifest.js
```

## Configure The Site

Edit `config.json` to change site-wide copy, labels, colors, and asset paths.

Episode titles, images, audio, and Markdown paths come from `episodes.json`.

## Change Images And Icons

All visual assets live in the repo as files you can edit directly:

| What to change | File or folder |
|----------------|----------------|
| Site logo | `assets/images/logo.svg` or `config.json` → `logoUrl` |
| Flag / region icon | `assets/images/flag.svg` or `flagIconUrl` |
| Browser tab icon | `assets/images/favicon.svg` |
| Hero row icons | `assets/images/hero/*.svg` or `config.json` → `assets.heroIcons` |
| Play / pause / mute buttons | `assets/icons/ui/*.svg` |
| Glossary tile icons | `assets/icons/telecom/*.svg` or `glossary.json` → `icon` |
| Default animated avatar | `assets/images/avatar-fallback.svg` |
| Male speaker avatars (3) | `assets/images/avatars/male-1.svg` … `male-3.svg` |
| Female speaker avatars (3) | `assets/images/avatars/female-1.svg` … `female-3.svg` |
| Episode cover image | `episodes/epN/image.png` (or `.jpg`, `.webp`) |
| Episode audio | `episodes/epN/audio.mp3` |
| Glossary audio | `glossary/gN/audio.mp3` + `"audio"` field in `glossary.json` |

Swap any SVG/PNG file in place, or point `config.json` `assets` paths to your own files. PNG/JPG logos work too — set `logoUrl` to e.g. `assets/images/logo.png`.

## Add Episodes (drop-in folders)

Create a new folder under `episodes/` with at least `text.md`. The site picks it up automatically when you use the dev server.

```bash
npm start
# or: node scripts/serve.js
```

Then open http://localhost:8000 — refresh after adding or editing a folder.

**Quick start:** copy the template folder:

```bash
cp -r episodes/_template episodes/ep4
# add image.png, audio.mp3, edit text.md and meta.json
```

Each episode folder:

```text
episodes/
  ep4/
    meta.json       # optional — title, date, voice (male|female)
    text.md         # required — shown in the reader
    image.png       # cover (jpg/webp also work)
    audio.mp3       # narration
    timing.json     # optional — auto-generated for word highlights
```

`meta.json` example:

```json
{
  "title": "Episode Four",
  "date": "2025-06-04",
  "voice": "female"
}
```

Supported media names:

- Images: `image.jpg`, `image.jpeg`, `image.png`, `image.webp`
- Audio: `audio.mp3`, `audio.m4a`, `audio.ogg`, `audio.wav`
- Avatar: `avatar.png`, `avatar.jpg`, `avatar.webp` (optional photo override)

Folders starting with `_` (like `_template`) and `reference/` are ignored.

For **GitHub Pages / static deploy**, generate a manifest once before upload:

```bash
node scripts/generate_manifest.js
```

`generate_timing.js` builds `episodes/epN/timing.json` from each episode's `text.md` and audio duration. It detects silence gaps in the narration and maps words across speech segments so highlights track the voice more closely. Requires `ffmpeg` and `ffprobe`.

If highlights are slightly early or late, adjust `"highlightOffset"` in `config.json` (try `-0.15` or `0.15` seconds).

## Voice And Avatar Mapping (Automatic)

The site picks a **male or female avatar automatically** from the audio voice:

1. **While playing** — pitch is analyzed from the audio and the matching avatar appears.
2. **Before play** — run voice detection so the right avatar shows immediately:

```bash
node scripts/detect_voice.js
node scripts/generate_manifest.js
```

`detect_voice.js` reads each `audio.mp3`, detects male/female from pitch, and saves it to `meta.json` / `glossary.json`.

Optional fields (only if you need to override auto-detection):

```json
{
  "title": "Episode One",
  "voiceOverride": "male",
  "avatarVariant": 0
}
```

- `voiceOverride`: force `"male"` or `"female"` when auto-detection is wrong
- `avatarVariant`: `0`, `1`, or `2` (which of the three avatars for that gender)

Glossary entries support the same fields in `glossary.json`.

## Glossary

Edit `glossary.json` directly. Audio is optional — entries without an `audio` field show text only.

To add audio, drop `audio.mp3` into `glossary/g1/` (folders `g1`–`g6` already exist) and add `"audio": "glossary/g1/audio.mp3"` to the matching entry in `glossary.json`.

## Test Locally

The site uses `fetch`, so open it through a local server:

```bash
npx serve .
```

Or:

```bash
python3 -m http.server 8000
```

Then open the shown local URL, such as `http://localhost:8000`.

## Free Hosting

GitHub Pages, Netlify, and Vercel all host this project as static files. Push or upload the full folder, including `index.html`, `config.json`, `episodes.json`, `glossary.json`, `assets/`, `episodes/`, and `scripts/`.
