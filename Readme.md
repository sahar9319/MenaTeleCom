
### How to create & serve this project for free

**1. Set up the project locally**  
Create a folder with this structure:
my-research-site/
├── index.html (paste the generated code)
├── episodes.json (will be generated)
├── generate_manifest.js
└── episodes/
├── ep1/
│ ├── image.jpg
│ ├── text.txt
│ └── audio.mp3
├── ep2/
│ ├── image.jpg
│ ├── text.txt
│ └── audio.mp3
└── ... (add more episode folders)

text

**2. Generate the manifest**  
Run the Node.js script (make sure you have Node installed):

```bash
node generate_manifest.js
This scans episodes/ and writes episodes.json with the correct paths.
The script will be provided by Codex based on the prompt – it should read the folder names and look for image.jpg, text.txt, audio.mp3 inside.

3. Test locally
Because the page fetches JSON and text files, you need a local server (just opening index.html will fail due to CORS). Use any of these free one-liners:

Python: python -m http.server 8000 (then open http://localhost:8000)

Node: npx serve .

VS Code Live Server extension

4. Host for free (static site)
The best free options:

GitHub Pages

Create a public GitHub repository.
Push all the files (including episodes/ folders and episodes.json).
Go to repository Settings → Pages → Source: Deploy from a branch → select main (or master) → Save.
Your site will be live at https://<username>.github.io/<repo-name>/.
Netlify / Vercel (also free)

Sign up, connect your GitHub repo, and it deploys automatically on every push.

Netlify even gives you a drag‑and‑drop deployment (just upload the project folder).

All these services serve static files perfectly, and the fetch calls to episodes.json and the text files will work because they’re served from the same origin.

5. Adding new episodes later

Create a new folder episodes/ep3/ with the three files.

Run node generate_manifest.js again to update episodes.json.

Push the changes – your site updates automatically (no rebuild needed).