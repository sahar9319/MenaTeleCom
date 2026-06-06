# MenaTeleCom Research Episodes

A static, single-page telecom research site with a Home landing view and an Episodes view. It uses vanilla HTML/CSS/JS, Markdown rendering, custom audio controls, quick image previews, sentence highlighting, and an audio-reactive avatar.

## Run Locally

Use a local server because the site fetches JSON, Markdown, audio, and image files:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`.

## Configure

Edit `config.json` to change labels, colors, avatar settings, and behavior:

```json
{
  "siteTitle": "MENA Telecommunication Market",
  "homeButtonText": "Home",
  "episodesButtonText": "Episodes",
  "avatarImageUrl": "episodes/ep1/avatar.png",
  "primaryColor": "#1E3A5F",
  "accentColor": "#E07A5F"
}
```

## Episodes

Create one folder per episode:

```text
episodes/
  ep1/
    image.png
    text.md
    audio.mp3
    timing.json
    meta.json
```

`timing.json` is optional and enables exact sentence highlighting:

```json
[{ "word": "Hello", "start": 0, "end": 0.4 }]
```

Generate `episodes.json`:

```bash
node generate_episodes_manifest.js
```

## Hosting

The project is fully static. Upload the folder to GitHub Pages, Netlify, Vercel, or any static host. Include:

```text
index.html
config.json
episodes.json
episodes/
```
