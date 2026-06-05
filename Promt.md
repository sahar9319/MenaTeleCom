Create a single‑page static website (index.html with embedded CSS and JavaScript) for sharing research episodes.  
Only vanilla HTML, CSS, and JavaScript – no frameworks, no external libraries.

### 1. Theme & Design
- **Claymorphism**: soft 3D, rounded corners (20–30px), pastel palette (customisable via CSS variables), double shadows (outer dark, inner light).
- **Telecommunication signs** theme: decorative background elements (antennas, signal waves, satellite dishes) as inline SVG or CSS shapes, subtle and non‑intrusive.
- All animations professional, smooth (cubic‑bezier(0.4, 0.0, 0.2, 1) or custom), hardware‑accelerated (use transform and opacity only).

### 2. Data & Directory Structure
Episode files stored in `episodes/`. Each subfolder (e.g., `ep1/`) contains:
- `image.jpg` (main image)
- `text.md` (Markdown content)
- `audio.mp3` (voice recording)
- (Optional) `meta.json` with `{ "title": "My Title", "date": "2025-01-15" }` – if present, use it; else fallback to folder name as title.

The site reads a manifest `episodes.json` at root:
```json
[
  {
    "id": "ep1",
    "title": "Episode Title",
    "image": "episodes/ep1/image.jpg",
    "text": "episodes/ep1/text.md",
    "audio": "episodes/ep1/audio.mp3"
  }
]
```

### 3. Manifest Generator
Provide a separate Node.js script `generate_manifest.js` that:
- Scans the `episodes/` folder.
- Reads `meta.json` inside each if available for title; otherwise uses the folder name.
- Writes `episodes.json` with correct relative paths.
- The user runs it locally before uploading.

### 4. Markdown Rendering (Vanilla JS)
- Write a function `parseMarkdown(md)` that converts .md content to HTML.
- Support: headings (`#`, `##`, `###`), bold (`**`), italic (`*`), links (`[text](url)`), unordered lists (`- item`), paragraphs (separated by blank lines).
- Escape HTML special characters to prevent XSS.
- Use the rendered HTML on the episode’s back face.

### 5. Main Page Layout – Responsive Grid
- Cards displayed in a grid:
  - ≥ 1024px → 3 columns
  - 768px–1023px → 2 columns
  - < 768px → 1 column
- Each card is a clay‑style container with:
  - **Cover image** (object-fit: cover, border-radius matches card).
  - Optional title overlay.
  - **“Quick View” button** (eye/magnifier icon) in a corner – does not overlap the main clickable area.
  - The entire image area is clickable for the full‑screen flip.

### 6. Loading States & Skeleton
- While fetching `episodes.json` and the Markdown texts, show a **skeleton loader**:
  - Grid of clay‑coloured, pulsing rectangles matching card dimensions.
- Once data is ready, fade out the skeleton and show the real cards.
- Cache all fetched text (and parsed HTML) in memory so flipping a card again doesn’t re‑fetch.

### 7. Full‑Screen Flip Interaction
When a user clicks a card’s image (or presses Enter on a focused card):
1. **Expand**: Card smoothly scales up to fill the viewport (use `transform: scale()` + fixed positioning, 400ms ease‑out).
2. **Flip**: Once fullscreen, the card rotates 180° on Y‑axis (600ms, `backface-visibility: hidden`).
3. **Back face** displays:
   - The episode’s rendered Markdown text (scrollable if needed).
   - A **clay‑styled audio player** (native `<audio>` with custom CSS, play/pause, progress, time, volume).
   - A **“Back” button** (arrow or ✕ icon).
4. **Return to main**:
   - Card flips back (0°, 600ms), then shrinks to original grid position (400ms).
   - Triggers:
     - Clicking the back button.
     - Swiping down on mobile (detect touchstart/touchend difference, if > 80px, dismiss).
     - Pressing Escape key.
     - **Auto‑return**: When audio finishes, wait 1 second then reverse (unless user already closed).
5. **Keyboard shortcuts** while expanded:
   - `Space`: toggle audio play/pause (prevent page scroll).
   - `Escape`: close and go back.
6. When returning, the audio must pause/reset.

### 8. Quick View (Image‑only, 5 seconds)
- The “Quick View” button opens a **lightbox**:
  - Dark semi‑transparent backdrop, episode’s image centred.
  - Image scales up with a fade+scale animation.
  - A 5‑second countdown (visual indicator optional) auto‑closes the lightbox with reverse animation.
- User can dismiss earlier by:
  - Clicking outside the image (on backdrop).
  - Pressing Escape.
  - (Optional) Swipe down on mobile.
- No audio plays, and the lightbox is independent of the flip interaction.

### 9. Audio Player Styling
- Custom HTML/CSS controls: play/pause button, progress bar (input[type=range]), time display, volume slider.
- All elements follow the claymorphism aesthetic.
- The player must be fully functional on touch and mouse.

### 10. Error Handling & Accessibility
- If an image/audio/text fails to load, show a friendly fallback (e.g., “Image not available” placeholder).
- If `episodes.json` fetch fails, display a message on the page.
- ARIA labels and roles: cards are buttons, proper alt texts, focus management (when expanded, trap focus inside if possible, or at least move focus to the back button).
- Semantic HTML throughout.

### 11. Technical Requirements
- All code in a single `index.html` (style and script inline).
- Use modern ES6+ (async/await, fetch, const/let, arrow functions).
- CSS variables for easy restyling (e.g., `--bg`, `--shadow-dark`, `--shadow-light`, `--radius`).
- Mobile‑first responsive design, no 300ms tap delay (use `touch-action: manipulation`).
- The page must work offline once loaded? Not required, but cache manifest/service worker not needed.

### 12. Deliverables
- `index.html` – the full website.
- `generate_manifest.js` – the Node script.
- A short `README.md` explaining:
  - How to add episodes (create folder with files)
  - How to generate `episodes.json`
  - How to test locally (e.g., `npx serve .`)
  - The free hosting options (GitHub Pages, Netlify, Vercel)

Write clean, well‑commented code. Prefer clarity and maintainability over micro‑optimisations.
```

---

## How to host the project for free

1. **Create your local project**  
   ```
   my-research-site/
   ├── index.html
   ├── generate_manifest.js
   ├── episodes.json          (will be generated)
   └── episodes/
       ├── ep1/
       │   ├── image.jpg
       │   ├── text.md
       │   ├── audio.mp3
       │   └── meta.json       (optional)
       └── ep2/ ...
   ```

2. **Generate the manifest**  
   Run `node generate_manifest.js` – it will scan `episodes/` and write `episodes.json`.

3. **Test locally**  
   Because the page uses `fetch`, you need a local server. Choose one:
   - `npx serve .`
   - `python -m http.server 8000`
   - VS Code Live Server extension  
   Open `http://localhost:8000` (or port shown).

4. **Deploy (free, static)**  
   - **GitHub Pages** (simplest)  
     Create a public repo, push all files, then in Settings → Pages → Source: `main` branch → root → Save.  
     Site will be at `https://<username>.github.io/<repo>/`.

   - **Netlify**  
     Sign up, drag & drop your project folder, and it’s live instantly with a URL you can customise.

   - **Vercel**  
     Import your GitHub repo, and it auto‑deploys.

All services serve static files perfectly, so `fetch` requests to your JSON and `.md` files work natively.