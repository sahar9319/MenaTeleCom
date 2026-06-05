# MenaTeleCom Research Episodes

A single-page static website for sharing research episodes with images, Markdown notes, and audio recordings.

## Add Episodes

Create one folder per episode inside `episodes/`:

```text
episodes/
  ep1/
    image.jpg
    text.md
    audio.mp3
    meta.json
```

`meta.json` is optional:

```json
{
  "title": "My Title",
  "date": "2025-01-15"
}
```

Images can use `image.jpg`, `image.jpeg`, `image.png`, or `image.webp`. Audio can use `audio.mp3`, `audio.m4a`, `audio.ogg`, or `audio.wav`.

## Generate The Manifest

Run this before uploading or deploying:

```bash
node generate_manifest.js
```

The script scans `episodes/` and writes `episodes.json` with relative paths used by `index.html`.

## Test Locally

The site uses `fetch`, so open it through a local server:

```bash
npx serve .
```

Or:

```bash
python -m http.server 8000
```

Then open the shown local URL, such as `http://localhost:8000`.

## Free Hosting

GitHub Pages, Netlify, and Vercel all host this project as static files. Push or upload the full folder, including `index.html`, `episodes.json`, `generate_manifest.js`, and `episodes/`.
