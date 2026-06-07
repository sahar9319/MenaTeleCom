const DEFAULT_CONFIG = {
  siteTitle: "Research Episodes",
  tagline: "Signal stories",
  eyebrow: "Research Broadcast",
  description: "Browse field notes, recordings, and visual research from each episode.",
  homeButtonText: "Home",
  glossaryButtonText: "Glossary",
  glossaryEyebrow: "Audio Glossary",
  glossaryTitle: "Audio Glossary Table",
  glossaryDescription: "Tap a telecom term to hear the field note and read the elaboration.",
  glossaryAriaLabel: "Audio glossary",
  glossaryLoadingLabel: "Loading glossary",
  glossaryError: "Glossary could not be loaded. Check that glossary.json exists and that you are using a local server.",
  glossaryEmpty: "No glossary entries are available yet.",
  glossaryCloseText: "Close",
  glossaryAutoClose: false,
  backButtonText: "Back to main page",
  openEpisodeLabel: "Open episode",
  quickViewTooltip: "Quick preview",
  errorImageMissing: "Image not available",
  errorEpisodesMissing: "Episodes could not be loaded. Run npm start (or node scripts/serve.js) and open http://localhost:8000",
  errorTextMissing: "Text is not available for this episode yet.",
  audioPlayLabel: "Play",
  audioPauseLabel: "Pause",
  muteTitle: "Mute",
  unmuteTitle: "Unmute",
  episodesAriaLabel: "Research episodes",
  loadingEpisodesLabel: "Loading episodes",
  audioPlayerLabel: "Audio player",
  audioProgressLabel: "Audio progress",
  audioUnavailable: "Audio not available",
  audioError: "Audio could not be played. Try interacting with the page first or check the audio file.",
  loadingText: "Loading episode notes...",
  volumeLabel: "Volume",
  primaryColor: "#1E3A5F",
  accentColor: "#E07A5F",
  secondaryColor: "#2A9D8F",
  tertiaryColor: "#D9A441",
  successColor: "#5FA8A0",
  backgroundColor: "#EEF2EF",
  surfaceColor: "#F4F1EA",
  inkColor: "#1F2D3A",
  mutedColor: "#66747A",
  clayLight: "#F4F1EA",
  clayDark: "#B7C9D3",
  avatarSkinColor: "#FDDCB5",
  avatarHeadsetColor: "#3D5A80",
  avatarImageUrl: "episodes/ep1/avatar.png",
  highlightColor: "rgba(224, 122, 95, 0.26)",
  highlightLeadIn: 0.08,
  highlightOffset: 0,
  avatarSize: "132px",
  logoUrl: "assets/images/logo.svg",
  flagIconUrl: "assets/images/flag.svg",
  assets: null
};

const DEFAULT_ASSETS = {
  logo: "assets/images/logo.svg",
  flag: "assets/images/flag.svg",
  favicon: "assets/images/favicon.svg",
  avatarFallback: "assets/images/avatar-fallback.svg",
  heroIcons: [
    { src: "assets/images/hero/broadcast.svg", tone: "var(--primary)" },
    { src: "assets/images/hero/research.svg", tone: "var(--secondary)" },
    { src: "assets/images/hero/network.svg", tone: "var(--tertiary)" },
    { src: "assets/images/hero/analytics.svg", tone: "var(--success)" }
  ],
  ui: {
    play: "assets/icons/ui/play.svg",
    pause: "assets/icons/ui/pause.svg",
    mute: "assets/icons/ui/mute.svg",
    unmute: "assets/icons/ui/unmute.svg",
    quickView: "assets/icons/ui/quick-view.svg"
  },
  telecom: {
    antenna: "assets/icons/telecom/antenna.svg",
    signal: "assets/icons/telecom/signal.svg",
    tower: "assets/icons/telecom/tower.svg",
    satellite: "assets/icons/telecom/satellite.svg",
    handset: "assets/icons/telecom/handset.svg",
    radio: "assets/icons/telecom/radio.svg"
  },
  avatars: {
    male: ["assets/images/avatars/clay-male.svg"],
    female: ["assets/images/avatars/clay-female.svg"]
  }
};

const TIMING = {
  quickView: 5000,
  fade: 260,
  skeletonFade: 300,
  expand: 390,
  flip: 580,
  startDelay: 24,
  autoReturnDelay: 1000
};
const SWIPE_DISMISS_DISTANCE = 80;

const root = document.documentElement;
const appShell = document.querySelector(".app-shell");
const homeBtn = document.querySelector("#homeBtn");
const glossaryBtn = document.querySelector("#glossaryBtn");
const brandTitle = document.querySelector("#brandTitle");
const brandTagline = document.querySelector("#brandTagline");
const logoWrap = document.querySelector("#logoWrap");
const flagWrap = document.querySelector("#flagWrap");
const heroEyebrow = document.querySelector("#heroEyebrow");
const heroTitle = document.querySelector("#heroTitle");
const heroDescription = document.querySelector("#heroDescription");
const episodesView = document.querySelector("#episodesView");
const glossaryView = document.querySelector("#glossaryView");
const glossaryEyebrow = document.querySelector("#glossaryEyebrow");
const glossaryTitle = document.querySelector("#glossaryTitle");
const glossaryDescription = document.querySelector("#glossaryDescription");
const glossaryStatus = document.querySelector("#glossaryStatus");
const glossaryGrid = document.querySelector("#glossaryGrid");
const grid = document.querySelector("#grid");
const skeleton = document.querySelector("#skeleton");
const audioPlayer = document.querySelector("#audioPlayer");
const statusBox = document.querySelector("#status");
const flipLayer = document.querySelector("#flipLayer");
const flipShell = document.querySelector("#flipShell");
const flipCard = document.querySelector("#flipCard");
const frontFace = document.querySelector("#frontFace");
const markdownBody = document.querySelector("#markdownBody");
const avatarHost = document.querySelector("#avatarHost");
const expandedTitle = document.querySelector("#expandedTitle");
const expandedDate = document.querySelector("#expandedDate");
const readerHomeBtn = document.querySelector("#readerHomeBtn");
const backBtn = document.querySelector("#backBtn");
const audio = document.querySelector("#audio");
const playBtn = document.querySelector("#playBtn");
const playIcon = document.querySelector("#playIcon");
const muteBtn = document.querySelector("#muteBtn");
const muteIcon = document.querySelector("#muteIcon");
const progress = document.querySelector("#progress");
const volume = document.querySelector("#volume");
const volumeLabel = document.querySelector("#volumeLabel");
const timeDisplay = document.querySelector("#timeDisplay");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionDuration = (name) => reduceMotion.matches ? 0 : TIMING[name];
const scheduleIdle = window.requestIdleCallback || ((callback) => setTimeout(callback, 1));
const markdownCache = new Map();
const timingCache = new Map();
const iconCache = new Map();
const glossaryAudioState = new WeakMap();

let config = DEFAULT_CONFIG;
let episodes = [];
let glossaryEntries = null;
let currentView = "episodes";
let activeGlossaryTile = null;
let activeSourceCard = null;
let isExpanded = false;
let isClosing = false;
let closeAudioTimer = null;
let quickTimer = null;
let quickTouchY = null;
let flipTouchY = null;
let previousFocus = null;
let resizeFrame = null;
let audioContext = null;
let avatarAnalyser = null;
let avatarData = null;
let avatarFreqData = null;
let avatarFrame = null;
let blinkTimer = null;
let mouthLevel = 0;
let mouthWidth = 0;
let mouthRound = 0;
let mouthTeeth = 0;
let browLevel = 0;
let nodLevel = 0;
let lastRms = 0;
let activeAudio = null;
let connectedAvatarSource = null;
const audioSources = new WeakMap();
let activeLine = null;
let highlightFrame = null;
let highlightRaf = null;
let pendingEstimatedHighlight = false;
let activeTiming = [];
let avatarTiming = [];
let avatarTimingIndex = 0;
let activeSpeaker = null;
let activeEpisode = null;
let talkPulse = 0;
let blinkSequence = 0;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const averageBand = (data, startRatio, endRatio) => {
  if (!data?.length) return 0;

  const start = Math.max(0, Math.min(data.length - 1, Math.floor(data.length * startRatio)));
  const end = Math.max(start + 1, Math.min(data.length, Math.floor(data.length * endRatio)));
  let sum = 0;

  for (let index = start; index < end; index += 1) {
    sum += data[index] / 255;
  }

  return sum / (end - start);
};

const resolveAssets = () => {
  const merged = {
    ...DEFAULT_ASSETS,
    ...(config.assets || {}),
    ui: { ...DEFAULT_ASSETS.ui, ...(config.assets?.ui || {}) },
    telecom: { ...DEFAULT_ASSETS.telecom, ...(config.assets?.telecom || {}) },
    avatars: {
      male: [...(config.assets?.avatars?.male || DEFAULT_ASSETS.avatars.male)],
      female: [...(config.assets?.avatars?.female || DEFAULT_ASSETS.avatars.female)]
    }
  };
  if (config.assets?.heroIcons) {
    merged.heroIcons = config.assets.heroIcons;
  }
  return merged;
};

const fetchSvg = async (path) => {
  if (!path) return "";
  if (iconCache.has(path)) return iconCache.get(path);

  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const svg = await response.text();
    iconCache.set(path, svg);
    return svg;
  } catch (error) {
    iconCache.set(path, "");
    return "";
  }
};

const collectAssetPaths = (assets) => {
  const paths = new Set([
    assets.logo,
    assets.flag,
    assets.favicon,
    assets.avatarFallback,
    ...Object.values(assets.ui),
    ...Object.values(assets.telecom),
    ...assets.heroIcons.map((item) => item.src),
    ...assets.avatars.male.filter((path) => /\.svg(?:[?#]|$)/i.test(path)),
    ...assets.avatars.female.filter((path) => /\.svg(?:[?#]|$)/i.test(path))
  ]);
  return [...paths].filter(Boolean);
};

const preloadAssets = async () => {
  const assets = resolveAssets();
  await Promise.all(collectAssetPaths(assets).map(fetchSvg));
};

const svgIcon = (path) => iconCache.get(path) || "";

const telecomIcon = (name = "signal") => {
  const assets = resolveAssets();
  const path = name.includes("/") ? name : (assets.telecom[name] || assets.telecom.signal);
  return svgIcon(path);
};

const setElementIcon = (element, path) => {
  if (!element || !path) return;
  const svg = svgIcon(path);
  if (svg.trim().startsWith("<svg")) {
    element.innerHTML = svg;
    return;
  }
  element.innerHTML = `<img src="${escapeHtml(path)}" alt="" aria-hidden="true">`;
};

const applyTheme = () => {
  root.style.setProperty("--primary", config.primaryColor);
  root.style.setProperty("--accent", config.accentColor || config.secondaryColor);
  root.style.setProperty("--secondary", config.secondaryColor);
  root.style.setProperty("--tertiary", config.tertiaryColor);
  root.style.setProperty("--success", config.successColor);
  root.style.setProperty("--bg", config.backgroundColor);
  root.style.setProperty("--surface", config.surfaceColor);
  root.style.setProperty("--ink", config.inkColor);
  root.style.setProperty("--muted", config.mutedColor);
  root.style.setProperty("--clay-light", config.clayLight);
  root.style.setProperty("--clay-dark", config.clayDark);
  root.style.setProperty("--avatar-skin-color", config.avatarSkinColor || "#FDDCB5");
  root.style.setProperty("--avatar-headset-color", config.avatarHeadsetColor || config.primaryColor);
  root.style.setProperty("--highlight-color", config.highlightColor || "rgba(224, 122, 95, 0.26)");
  root.style.setProperty("--avatar-size", config.avatarSize || "150px");
};

const applyCopy = () => {
  document.title = config.siteTitle;
  brandTitle.textContent = config.siteTitle;
  brandTagline.textContent = config.tagline;
  heroEyebrow.textContent = config.eyebrow || config.tagline;
  heroTitle.textContent = config.siteTitle;
  heroDescription.textContent = config.description;
  homeBtn.querySelector("span").textContent = config.homeButtonText;
  homeBtn.setAttribute("aria-label", config.homeButtonText);
  glossaryBtn.querySelector("span").textContent = config.glossaryButtonText;
  glossaryBtn.setAttribute("aria-label", config.glossaryButtonText);
  glossaryEyebrow.textContent = config.glossaryEyebrow;
  glossaryTitle.textContent = config.glossaryTitle;
  glossaryDescription.textContent = config.glossaryDescription;
  readerHomeBtn.querySelector("span").textContent = config.homeButtonText;
  readerHomeBtn.setAttribute("aria-label", config.homeButtonText);
  backBtn.querySelector("span").textContent = config.backButtonText;
  backBtn.setAttribute("aria-label", config.backButtonText);
  playBtn.setAttribute("aria-label", config.audioPlayLabel);
  muteBtn.setAttribute("aria-label", config.muteTitle);
  muteBtn.title = config.muteTitle;
  grid.setAttribute("aria-label", config.episodesAriaLabel);
  skeleton.setAttribute("aria-label", config.loadingEpisodesLabel);
  glossaryGrid.setAttribute("aria-label", config.glossaryAriaLabel);
  audioPlayer.setAttribute("aria-label", config.audioPlayerLabel);
  progress.setAttribute("aria-label", config.audioProgressLabel);
  volumeLabel.textContent = config.volumeLabel;
  lightbox.setAttribute("aria-label", config.quickViewTooltip);
};

const applyHeroIcons = () => {
  const heroRow = document.querySelector("#heroIcons");
  if (!heroRow) return;

  const assets = resolveAssets();
  heroRow.replaceChildren(...assets.heroIcons.map((item) => {
    const tile = document.createElement("div");
    tile.className = "clay-icon";
    tile.style.setProperty("--tone", item.tone);
    tile.innerHTML = svgIcon(item.src) || `<img src="${escapeHtml(item.src)}" alt="">`;
    return tile;
  }));
};

const applyFavicon = () => {
  const assets = resolveAssets();
  const href = assets.favicon;
  if (!href) return;

  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.append(link);
  }
  link.href = href;
  link.type = href.endsWith(".svg") ? "image/svg+xml" : "";
};

const applyAssets = () => {
  const assets = resolveAssets();
  const logoUrl = config.logoUrl || assets.logo;
  const flagUrl = config.flagIconUrl || assets.flag;

  if (logoUrl) {
    setElementIcon(logoWrap, logoUrl);
  }

  if (flagUrl) {
    flagWrap.classList.remove("hidden");
    setElementIcon(flagWrap, flagUrl);
  }

  applyHeroIcons();
  applyFavicon();
  setElementIcon(playIcon, assets.ui.play);
  setElementIcon(muteIcon, assets.ui.mute);
};

const setStatus = (message) => {
  statusBox.textContent = message;
  statusBox.classList.toggle("visible", Boolean(message));
};

const setGlossaryStatus = (message) => {
  glossaryStatus.textContent = message;
  glossaryStatus.classList.toggle("visible", Boolean(message));
};

const setBackgroundInert = (inert) => {
  appShell.inert = inert;
};

const switchView = async (view) => {
  if (currentView === view) return;
  const leaving = currentView === "glossary" ? glossaryView : episodesView;
  const entering = view === "glossary" ? glossaryView : episodesView;

  leaving.classList.add("is-exiting");
  await wait(motionDuration("fade"));
  leaving.classList.add("hidden");
  leaving.classList.remove("is-exiting");
  entering.classList.remove("hidden");
  requestAnimationFrame(() => entering.classList.remove("is-exiting"));
  currentView = view;
};

const goHome = async () => {
  if (lightbox.classList.contains("active")) {
    await closeQuickView(false);
  }
  if (isExpanded) {
    await closeEpisode(false);
  }
  if (activeGlossaryTile) {
    closeGlossaryTile(activeGlossaryTile);
  }
  await switchView("episodes");
  await loadEpisodes({ refresh: true });
  setBackgroundInert(false);
  document.querySelector("#top").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  homeBtn.focus({ preventScroll: true });
};

const escapeHtml = (text) => String(text)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const sanitizeUrl = (url) => {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed, window.location.href);
    if (["http:", "https:", "mailto:"].includes(parsed.protocol)) {
      return escapeHtml(trimmed);
    }
    if (trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("/")) {
      return escapeHtml(trimmed);
    }
  } catch (error) {
    return "#";
  }
  return "#";
};

const inlineMarkdown = (text) => {
  let html = escapeHtml(text);
  html = html.replace(/\[([^\]]+)]\(([^)\s]+)\)/g, (match, label, href) => {
    const safeHref = sanitizeUrl(href);
    const isExternal = /^https?:|^mailto:/i.test(href.trim());
    return `<a href="${safeHref}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return html;
};

const isListLine = (line) => /^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim());

function parseMarkdown(md) {
  const blocks = md.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html = [];

  blocks.forEach((block) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const lines = trimmed.split("\n");
    if (lines.every((line) => isListLine(line))) {
      const ordered = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${lines.map((line) => {
        const text = line.trim().replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
        return `<li>${inlineMarkdown(text)}</li>`;
      }).join("")}</${tag}>`);
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading && lines.length === 1) {
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    html.push(`<p>${inlineMarkdown(lines.join("<br>"))}</p>`);
  });

  return html.join("");
}

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

const plainMarkdown = (text) => String(text || "")
  .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
  .replace(/[#*_`>-]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const glossarySnippet = (text) => {
  const plain = plainMarkdown(text);
  return plain.length > 100 ? `${plain.slice(0, 100).trim()}...` : plain;
};

const episodeNumber = (episode) => {
  const match = String(episode?.id || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
};

const sortEpisodes = (list) => [...list].sort((a, b) => {
  if (a.date && b.date && a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }
  const diff = episodeNumber(a) - episodeNumber(b);
  if (diff !== 0) return diff;
  return String(a.id || "").localeCompare(String(b.id || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
});

const episodeFolder = (episode) => {
  const source = episode.text || episode.audio || "";
  const slash = source.lastIndexOf("/");
  return slash >= 0 ? source.slice(0, slash + 1) : "";
};

const assetCacheKey = (episode, field, fallback) => {
  const path = episode[field] || fallback;
  const version = episode[`${field}Updated`] || episode.textUpdated || "";
  return `${path}?v=${version}`;
};

const fetchEpisodeTiming = async (episode) => {
  const timingUrl = episode.timing || `${episodeFolder(episode)}timing.json`;
  if (!timingUrl) return [];
  const cacheKey = assetCacheKey(episode, "timing", timingUrl);
  if (timingCache.has(cacheKey)) return timingCache.get(cacheKey);

  try {
    const response = await fetch(cacheKey, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const timing = (await response.json()).filter((item) =>
      item && typeof item.word === "string" && Number.isFinite(Number(item.start)) && Number.isFinite(Number(item.end))
    );
    timingCache.set(cacheKey, timing);
    return timing;
  } catch (error) {
    timingCache.set(cacheKey, []);
    return [];
  }
};

const normalizeHighlightToken = (word) => String(word || "")
  .replace(/&amp;/gi, "&")
  .replace(/^[—–-]+/, "")
  .replace(/[^\w&]/g, "")
  .toLowerCase();

const shouldAttachToPreviousWord = (word) => (
  /^[.,;:!?)\]}"'»«]+$/.test(word) || /^[—–-]\S*$/.test(word)
);

const mergeOrphanPunctuation = (words) => {
  const merged = [];
  words.forEach((word) => {
    if (merged.length && shouldAttachToPreviousWord(word)) {
      merged[merged.length - 1] += word;
      return;
    }
    merged.push(word);
  });
  return merged;
};

const lineWeight = (element) => {
  const text = element.textContent.replace(/\s+/g, " ").trim();
  let weight = Math.max(12, text.length);
  if (/[.!?]["']?\s*$/.test(text)) weight *= 1.35;
  else if (/[:;]["']?\s*$/.test(text)) weight *= 1.15;
  return weight;
};

const normalizeTimingToAudio = (timing, duration) => {
  if (!timing.length || !Number.isFinite(duration) || duration <= 0) return timing;

  const timingEnd = timing[timing.length - 1].end;
  if (!timingEnd || Math.abs(timingEnd - duration) < 0.2) return timing;

  const ratio = duration / timingEnd;
  return timing.map((stamp) => ({
    word: stamp.word,
    start: Number((stamp.start * ratio).toFixed(3)),
    end: Number((Math.min(duration, stamp.end * ratio)).toFixed(3))
  }));
};

const cleanAvatarWord = (word) => normalizeHighlightToken(word)
  .replace(/&/g, "and")
  .replace(/[^a-z0-9]/g, "");

const avatarWordShape = (word, progress, duration) => {
  const text = cleanAvatarWord(word);
  if (!text) {
    return { active: false, open: 0, wide: 0.08, round: 0.12, teeth: 0 };
  }

  const p = clamp(progress);
  const vowels = text.match(/[aeiouy]/g) || [];
  const vowelDensity = vowels.length / Math.max(1, text.length);
  const wideVowels = text.match(/[aeiy]/g) || [];
  const roundedVowels = text.match(/[ouw]/g) || [];
  const roundedDensity = roundedVowels.length / Math.max(1, vowels.length || 1);
  const wideDensity = wideVowels.length / Math.max(1, vowels.length || 1);
  const durationBoost = duration < 0.16 ? 0.8 : duration < 0.28 ? 0.94 : 1;
  const envelope = clamp(Math.sin(Math.PI * p) * 1.12) * durationBoost;
  const bilabialStart = /^[bmp]/.test(text) ? clamp(1 - p / 0.2) : 0;
  const bilabialEnd = /[bmp]$/.test(text) ? clamp((p - 0.76) / 0.24) : 0;
  const closed = Math.max(bilabialStart, bilabialEnd);
  const fricative = /(f|v|th|s|z|sh|ch|j|x)/.test(text);
  const softTeeth = /(f|v|th)/.test(text) ? 0.75 : /(s|z|sh|ch|j)/.test(text) ? 0.34 : 0;
  const rounded = clamp((roundedDensity * 0.72 + (/^w/.test(text) ? 0.22 : 0)) * envelope * (1 - closed * 0.72));
  const wide = clamp((0.08 + wideDensity * 0.28 + (fricative ? 0.12 : 0) + (/[r]/.test(text) ? 0.05 : 0)) * envelope);
  const openBase = 0.12 + vowelDensity * 0.42 + (/[a]/.test(text) ? 0.08 : 0) + (/[o]/.test(text) ? 0.05 : 0);
  const open = clamp(openBase * envelope * (1 - closed * 0.92), 0, 0.74);
  const teeth = clamp(softTeeth * envelope * (1 - closed), 0, 0.72);

  return { active: true, open, wide, round: rounded, teeth };
};

const avatarTimingShape = (audioElement) => {
  if (audioElement !== audio || !avatarTiming.length) {
    return { hasTiming: false, active: false, open: 0, wide: 0.08, round: 0.12, teeth: 0 };
  }

  const current = Math.max(0, (audioElement.currentTime || 0) + 0.045);
  while (avatarTimingIndex > 0 && current < avatarTiming[avatarTimingIndex].start - 0.12) {
    avatarTimingIndex -= 1;
  }
  while (avatarTimingIndex < avatarTiming.length - 1 && current > avatarTiming[avatarTimingIndex].end + 0.03) {
    avatarTimingIndex += 1;
  }

  const stamp = avatarTiming[avatarTimingIndex];
  if (stamp && current >= stamp.start - 0.035 && current <= stamp.end + 0.045) {
    const duration = Math.max(0.08, stamp.end - stamp.start);
    const progress = clamp((current - stamp.start) / duration);
    return { hasTiming: true, word: stamp.word, ...avatarWordShape(stamp.word, progress, duration) };
  }

  return { hasTiming: true, active: false, open: 0, wide: 0.08, round: 0.12, teeth: 0 };
};

const extractLineWords = (element) => mergeOrphanPunctuation(
  (element.textContent.match(/\S+/g) || [])
);

const sentenceBoundaries = (text) => {
  const source = String(text || "");
  if (!source.trim()) return [];

  const trimBoundary = ({ start, end }) => {
    let trimmedStart = start;
    let trimmedEnd = end;
    while (trimmedStart < trimmedEnd && /\s/.test(source[trimmedStart])) trimmedStart += 1;
    while (trimmedEnd > trimmedStart && /\s/.test(source[trimmedEnd - 1])) trimmedEnd -= 1;
    return { start: trimmedStart, end: trimmedEnd };
  };

  const usable = (boundary) => /[A-Za-z0-9]/.test(source.slice(boundary.start, boundary.end));

  if (window.Intl?.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return [...segmenter.segment(source)]
      .map((segment) => trimBoundary({
        start: segment.index,
        end: segment.index + segment.segment.length
      }))
      .filter((boundary) => boundary.end > boundary.start && usable(boundary));
  }

  const boundaries = [];
  const pattern = /[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    const boundary = trimBoundary({ start: match.index, end: pattern.lastIndex });
    if (boundary.end > boundary.start && usable(boundary)) boundaries.push(boundary);
  }
  return boundaries;
};

const textNodesFor = (element) => {
  const nodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
};

const textPositionAt = (nodes, targetOffset) => {
  let cursor = 0;
  for (const node of nodes) {
    const next = cursor + node.nodeValue.length;
    if (targetOffset <= next) {
      return { node, offset: Math.max(0, targetOffset - cursor) };
    }
    cursor = next;
  }

  const fallback = nodes[nodes.length - 1];
  return fallback ? { node: fallback, offset: fallback.nodeValue.length } : null;
};

const splitParagraphLines = () => {
  markdownBody.querySelectorAll("p:not(.text-line)").forEach((paragraph) => {
    if (!paragraph.querySelector("br")) return;

    const parts = paragraph.innerHTML
      .split(/<br\s*\/?>/i)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length <= 1) return;

    const wrapper = document.createDocumentFragment();
    parts.forEach((html) => {
      const line = document.createElement("p");
      line.className = "text-line";
      line.innerHTML = html;
      wrapper.append(line);
    });
    paragraph.replaceWith(wrapper);
  });
};

const splitHighlightSentences = () => {
  markdownBody.querySelectorAll("p, li, h1, h2, h3, h4, blockquote").forEach((element) => {
    if (element.dataset.sentencesWrapped === "true" || element.querySelector(".text-sentence")) return;

    const text = element.textContent;
    const boundaries = sentenceBoundaries(text);
    const nodes = textNodesFor(element);
    if (!boundaries.length || !nodes.length) return;

    boundaries.slice().reverse().forEach((boundary) => {
      const start = textPositionAt(nodes, boundary.start);
      const end = textPositionAt(nodes, boundary.end);
      if (!start || !end) return;

      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);

      const sentence = document.createElement("span");
      sentence.className = "text-sentence";
      sentence.append(range.extractContents());
      range.insertNode(sentence);
    });

    element.dataset.sentencesWrapped = "true";
  });
};

const collectHighlightLineElements = () => {
  splitParagraphLines();
  splitHighlightSentences();
  const sentences = [...markdownBody.querySelectorAll(".text-sentence")]
    .filter((element) => element.textContent.trim().length > 0);

  if (sentences.length) return sentences;

  return [...markdownBody.querySelectorAll("p, li, h1, h2, h3, h4, blockquote, p.text-line")]
    .filter((element) => element.textContent.trim().length > 0);
};

const buildWeightedLineTiming = (lines, duration) => {
  if (!lines.length || !Number.isFinite(duration) || duration <= 0) return [];

  const weights = lines.map(lineWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;

  return lines.map((_, index) => {
    const slice = (weights[index] / totalWeight) * duration;
    const start = cursor;
    cursor += slice;
    return {
      start: Number(start.toFixed(3)),
      end: Number(Math.min(duration, cursor).toFixed(3))
    };
  });
};

const repairWordTiming = (timing, duration) => {
  if (!timing.length) return timing;

  const repaired = timing.map((stamp) => ({
    word: stamp.word,
    start: Number(stamp.start),
    end: Number(Math.max(stamp.end, stamp.start + 0.04))
  }));

  let index = 0;
  while (index < repaired.length) {
    const flatStart = repaired[index].start;
    let endIndex = index;
    while (
      endIndex + 1 < repaired.length
      && Math.abs(repaired[endIndex + 1].start - flatStart) < 0.02
      && repaired[endIndex + 1].end - repaired[endIndex + 1].start < 0.03
    ) {
      endIndex += 1;
    }

    if (endIndex > index) {
      const spanStart = index > 0 ? repaired[index - 1].end : 0;
      const spanEnd = endIndex + 1 < repaired.length
        ? repaired[endIndex + 1].start
        : duration;
      const count = endIndex - index + 1;
      const slice = Math.max(0.08, (spanEnd - spanStart) / count);
      let cursor = spanStart;

      for (let flatIndex = index; flatIndex <= endIndex; flatIndex += 1) {
        cursor += slice;
        repaired[flatIndex].start = Number(Math.max(spanStart, cursor - slice).toFixed(3));
        repaired[flatIndex].end = Number(Math.min(duration, cursor).toFixed(3));
      }
    }

    index = endIndex + 1;
  }

  return repaired;
};

const buildLineTimingFromWords = (wordTiming, lines, duration) => {
  let scaled = normalizeTimingToAudio(wordTiming, duration);
  if (!scaled.length) {
    return buildWeightedLineTiming(lines, duration);
  }

  scaled = repairWordTiming(scaled, duration);

  const lineWordCounts = lines.map((element) => extractLineWords(element).length);
  const totalLineWords = lineWordCounts.reduce((sum, count) => sum + count, 0);
  const drift = Math.abs(totalLineWords - scaled.length);

  if (drift > Math.max(6, scaled.length * 0.04)) {
    return buildWeightedLineTiming(lines, duration);
  }

  let wordIndex = 0;
  const results = lineWordCounts.map((count) => {
    if (!count || wordIndex >= scaled.length) {
      return { start: duration, end: duration };
    }

    const startIdx = wordIndex;
    const endIdx = Math.min(scaled.length - 1, wordIndex + count - 1);
    wordIndex = endIdx + 1;

    return {
      start: scaled[startIdx].start,
      end: Math.max(scaled[endIdx].end, scaled[startIdx].start + 0.08)
    };
  });

  for (let index = 1; index < results.length; index += 1) {
    if (results[index].start < results[index - 1].end) {
      results[index].start = results[index - 1].end;
    }
    if (results[index].end <= results[index].start) {
      results[index].end = Number(Math.min(duration, results[index].start + 0.12).toFixed(3));
    }
  }

  if (results.length) {
    const last = results[results.length - 1];
    last.end = Number(Math.min(duration, Math.max(last.end, last.start + 0.1)).toFixed(3));
  }

  let lastGoodIndex = -1;
  results.forEach((stamp, index) => {
    const span = stamp.end - stamp.start;
    if (span >= 0.45 && stamp.start < duration - 1) {
      lastGoodIndex = index;
    }
  });

  if (lastGoodIndex >= 0 && lastGoodIndex < results.length - 1) {
    const tailStart = results[lastGoodIndex].end;
    const tailBudget = Math.max(0.5, duration - tailStart);
    const tailWeights = lineWordCounts.slice(lastGoodIndex + 1);
    const tailTotal = tailWeights.reduce((sum, weight) => sum + weight, 0) || 1;
    let cursor = tailStart;

    for (let index = lastGoodIndex + 1; index < results.length; index += 1) {
      const slice = (tailWeights[index - lastGoodIndex - 1] / tailTotal) * tailBudget;
      const start = cursor;
      cursor = Math.min(duration, start + Math.max(0.12, slice));
      results[index] = {
        start: Number(start.toFixed(3)),
        end: Number(Math.min(duration, Math.max(cursor, start + 0.12)).toFixed(3))
      };
    }
  }

  return results;
};

const clearLineHighlights = () => {
  markdownBody.querySelectorAll(".highlight-line.active").forEach((element) => {
    element.classList.remove("active");
  });
};

const enableLineHighlighting = (lineTimings, lineElements) => {
  activeLine = null;
  clearLineHighlights();

  if (!lineTimings.length || !lineElements.length) {
    markdownBody.dataset.highlighting = "false";
    return;
  }

  lineElements.forEach((element, index) => {
    const stamp = lineTimings[index];
    element.classList.add("highlight-line");
    if (!stamp) return;
    element.dataset.start = String(stamp.start);
    element.dataset.end = String(stamp.end);
  });

  markdownBody.dataset.highlighting = "true";
};

const applyHighlightTiming = (wordTiming) => {
  activeTiming = Array.isArray(wordTiming) ? wordTiming : [];
  const lines = collectHighlightLineElements();
  if (!lines.length) {
    markdownBody.dataset.highlighting = "false";
    avatarTiming = [];
    avatarTimingIndex = 0;
    return;
  }

  const duration = Number.isFinite(audio.duration) && audio.duration > 0
    ? audio.duration
    : (activeTiming[activeTiming.length - 1]?.end || 0);
  avatarTiming = activeTiming.length ? normalizeTimingToAudio(activeTiming, duration) : [];
  avatarTimingIndex = 0;

  const lineTimings = avatarTiming.length
    ? buildLineTimingFromWords(avatarTiming, lines, duration)
    : buildWeightedLineTiming(lines, duration);

  enableLineHighlighting(lineTimings, lines);
};

const waitForAudioDuration = () => new Promise((resolve) => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    resolve(audio.duration);
    return;
  }

  const finish = () => {
    audio.removeEventListener("loadedmetadata", finish);
    resolve(audio.duration || 0);
  };

  audio.addEventListener("loadedmetadata", finish);
  setTimeout(finish, 2500);
});

const enableEstimatedHighlighting = () => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0 || markdownBody.dataset.highlighting === "true") {
    pendingEstimatedHighlight = !Number.isFinite(audio.duration) || audio.duration <= 0;
    return;
  }

  applyHighlightTiming([]);
  pendingEstimatedHighlight = false;
};

const stopHighlightLoop = () => {
  if (highlightRaf !== null) {
    cancelAnimationFrame(highlightRaf);
    highlightRaf = null;
  }
  highlightFrame = null;
};

const updateLineHighlight = () => {
  if (!isExpanded || markdownBody.dataset.highlighting !== "true") return;

  const lines = markdownBody.querySelectorAll(".highlight-line");
  if (!lines.length) return;

  const offset = Number(config.highlightOffset || 0);
  const leadIn = Number(config.highlightLeadIn ?? 0.08);
  const current = Math.max(0, (audio.currentTime || 0) + offset - leadIn);
  let active = null;

  for (const line of lines) {
    const start = Number(line.dataset.start);
    const end = Number(line.dataset.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (current >= start && current < end) {
      active = line;
      break;
    }
  }

  if (!active) {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      const start = Number(line.dataset.start);
      if (Number.isFinite(start) && current >= start) {
        active = line;
        break;
      }
    }
  }

  if (active === activeLine) return;
  if (activeLine) activeLine.classList.remove("active");
  activeLine = active;
  if (activeLine) {
    activeLine.classList.add("active");
    if (!reduceMotion.matches) {
      activeLine.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }
};

const runHighlightLoop = () => {
  highlightRaf = null;
  if (!isExpanded || audio.paused || markdownBody.dataset.highlighting !== "true") {
    return;
  }
  updateLineHighlight();
  highlightRaf = requestAnimationFrame(runHighlightLoop);
};

const startHighlightLoop = () => {
  if (highlightRaf !== null) return;
  highlightRaf = requestAnimationFrame(runHighlightLoop);
};

const requestLineHighlight = () => {
  updateLineHighlight();
};

const builtInAvatar = () => {
  const assets = resolveAssets();
  return svgIcon(assets.avatarFallback);
};

const normalizeVoice = (voice) => {
  const value = String(voice || "male").toLowerCase();
  return value === "female" ? "female" : "male";
};

const resolveSpeakerVoice = (speaker = {}) => {
  if (speaker.voiceOverride) {
    return normalizeVoice(speaker.voiceOverride);
  }
  if (speaker.voice || speaker.gender) {
    return normalizeVoice(speaker.voice || speaker.gender);
  }
  return "male";
};

const isPhotoAvatarAsset = (url) => /\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.test(String(url || ""));

const resolveAvatarAsset = (url) => ({
  mode: isPhotoAvatarAsset(url) ? "photo" : "svg",
  url
});

const resolveSpeakerAvatar = (speaker = {}) => {
  const voice = resolveSpeakerVoice(speaker);
  const assets = resolveAssets();

  const variant = Number.isFinite(speaker.avatarVariant) ? speaker.avatarVariant : 0;
  const pool = assets.avatars[voice] || assets.avatars.male || [];
  const voiceUrl = pool[variant % pool.length] || pool[0];
  if (voiceUrl) {
    return { ...resolveAvatarAsset(voiceUrl), voice };
  }

  if (speaker.avatar) {
    return { mode: "photo", url: speaker.avatar, voice };
  }

  if (config.avatarImageUrl) {
    return { mode: "photo", url: config.avatarImageUrl, voice };
  }

  return { mode: "svg", url: "", voice };
};

const renderAvatarSvg = (url, voice = "male") => {
  const svg = svgIcon(url) || builtInAvatar();
  avatarHost.innerHTML = `
    <div class="clay-avatar-shell" data-voice="${escapeHtml(voice)}">
      <div class="clay-avatar-ring" aria-hidden="true"></div>
      <div class="clay-avatar-figure">${svg}</div>
    </div>
  `;
  avatarHost.dataset.avatarMode = "svg";
  avatarHost.dataset.voice = voice;
};

const renderAvatarPhoto = (url, voice = "male") => {
  avatarHost.innerHTML = `
    <div class="avatar-photo" data-voice="${escapeHtml(voice)}">
      <img src="${escapeHtml(url)}" alt="">
      <span class="avatar-photo-mouth" aria-hidden="true">
        <span class="avatar-photo-mouth-cover"></span>
        <span class="avatar-photo-mouth-cavity"></span>
        <span class="avatar-photo-mouth-line"></span>
        <span class="avatar-photo-lip avatar-photo-lip-top"></span>
        <span class="avatar-photo-lip avatar-photo-lip-bottom"></span>
        <span class="avatar-photo-teeth"></span>
      </span>
      <span class="avatar-photo-lid avatar-photo-lid-left" aria-hidden="true"></span>
      <span class="avatar-photo-lid avatar-photo-lid-right" aria-hidden="true"></span>
    </div>
  `;
  avatarHost.dataset.avatarMode = "photo";
  const img = avatarHost.querySelector("img");
  img.onerror = () => {
    const assets = resolveAssets();
    const pool = assets.avatars[voice] || assets.avatars.male || [];
    renderAvatarSvg(pool[0], voice);
  };
};

const renderAvatarForSpeaker = (speaker = {}) => {
  activeSpeaker = speaker;
  const resolved = resolveSpeakerAvatar(speaker);
  avatarHost.dataset.voice = resolved.voice;
  if (resolved.mode === "photo") {
    renderAvatarPhoto(resolved.url, resolved.voice);
    return;
  }
  renderAvatarSvg(resolved.url, resolved.voice);
};

const setPhotoBlink = (lids, amount) => {
  const closed = amount > 0.5;
  lids.forEach((lid) => {
    lid.style.opacity = closed ? "0.92" : "0";
    lid.style.transform = closed
      ? "translate(-50%, -52%) scaleY(1.08)"
      : "translate(-50%, -58%) scaleY(0.04)";
    lid.classList.toggle("is-closed", closed);
  });
};

const setAvatarExpression = (speaking) => {
  const mouth = avatarHost.querySelector(".avatar-mouth, .avatar-photo-mouth");
  const brows = avatarHost.querySelectorAll(".avatar-brow");
  const jaw = avatarHost.querySelector(".avatar-jaw");

  if (mouth) {
    const pulse = speaking
      ? Math.sin(performance.now() / 78) * 0.035 * mouthLevel
      : 0;
    talkPulse = pulse;
    const isPhoto = mouth.classList.contains("avatar-photo-mouth");

    if (isPhoto) {
      const open = speaking
        ? clamp(mouthLevel * 1.12 + Math.max(0, pulse) * 0.65, 0, 0.72)
        : 0;
      const round = speaking ? clamp(mouthRound + open * 0.18 - mouthWidth * 0.12, 0, 1) : 0.16;
      const wide = speaking
        ? clamp(0.16 + mouthWidth * 1.25 + (1 - round) * 0.14 + open * 0.12, 0.16, 0.76)
        : 0.16;
      mouth.style.setProperty("--photo-mouth-scale-x", (0.97 + wide * 0.12 - round * 0.045).toFixed(3));
      mouth.style.setProperty("--photo-cavity-width", `${(32 + wide * 27 - round * 7).toFixed(2)}%`);
      mouth.style.setProperty("--photo-cavity-height", `${(5 + open * 42 + round * 8).toFixed(2)}%`);
      mouth.style.setProperty("--photo-cavity-top", `${(53 + open * 1.4 + round * 0.6).toFixed(2)}%`);
      mouth.style.setProperty("--photo-lip-width", `${(54 + wide * 17 - round * 7).toFixed(2)}%`);
      mouth.style.setProperty("--photo-top-lip-top", `${(44 - open * 6.2 - round * 1.3).toFixed(2)}%`);
      mouth.style.setProperty("--photo-bottom-lip-top", `${(56 + open * 7.2 + round * 1.6).toFixed(2)}%`);
      mouth.style.setProperty("--photo-line-opacity", String(open > 0.16 ? Math.max(0.08, 0.5 - open * 0.72) : 0.52));
      mouth.style.setProperty("--photo-mouth-line-width", `${(50 + wide * 21 - round * 9).toFixed(2)}%`);
      mouth.style.setProperty("--photo-teeth-opacity", String(open > 0.2 && round < 0.58 ? Math.min(0.32, mouthTeeth * 0.56 + Math.max(0, open - 0.42) * 0.22) : 0));
      mouth.style.setProperty("--photo-rig-opacity", speaking ? String(0.56 + Math.min(0.18, open * 0.24)) : "0.5");
      mouth.classList.toggle("is-talking", speaking && open > 0.045);
    } else {
      const openY = 1 + mouthLevel * 2.55 + pulse;
      const openX = 1 + mouthWidth * 1.05 - mouthRound * 0.14 + (speaking ? pulse * 0.2 : 0);
      mouth.style.setProperty("--mouth-x", String(openX));
      mouth.style.setProperty("--mouth-y", String(openY));
      mouth.style.opacity = speaking ? String(0.52 + Math.min(0.4, mouthLevel * 0.85)) : "";
      mouth.classList.toggle("is-talking", speaking && mouthLevel > 0.025);
    }
  }

  if (jaw) {
    jaw.style.transform = `translateY(${speaking ? mouthLevel * 2.2 : 0}px)`;
  }

  brows.forEach((brow, index) => {
    const sideLift = nodLevel > 0.35 && index === 0 ? 1.4 : 0;
    brow.style.transform = `translateY(${-browLevel * 2.4 - sideLift}px)`;
  });

  avatarHost.classList.toggle("speaking", speaking);
};

const blinkAvatar = () => {
  const eyes = avatarHost.querySelectorAll(".avatar-eye, .avatar-pupil");
  const lids = avatarHost.querySelectorAll(".avatar-photo-lid");
  const sequence = blinkSequence + 1;
  blinkSequence = sequence;
  const duration = 96 + Math.random() * 42;
  const doubleBlink = Math.random() < 0.12;

  eyes.forEach((eye) => {
    eye.style.transform = "scaleY(0.1)";
  });
  lids.forEach((lid) => {
    lid.classList.add("is-closed");
  });
  setPhotoBlink(lids, 1);

  setTimeout(() => {
    if (blinkSequence !== sequence) return;
    eyes.forEach((eye) => {
      eye.style.transform = "";
    });
    setPhotoBlink(lids, 0);
    if (doubleBlink) {
      setTimeout(() => {
        if (blinkSequence !== sequence) return;
        setPhotoBlink(lids, 1);
        setTimeout(() => {
          if (blinkSequence !== sequence) return;
          setPhotoBlink(lids, 0);
          scheduleBlink();
        }, 74);
      }, 118);
      return;
    }
    scheduleBlink();
  }, duration);
};

const scheduleBlink = () => {
  clearTimeout(blinkTimer);
  const speaking = activeAudio && !activeAudio.paused && !activeAudio.muted;
  const min = speaking ? 1500 : 2000;
  const max = speaking ? 4000 : 5000;
  blinkTimer = setTimeout(blinkAvatar, min + Math.random() * (max - min));
};

const stopAvatar = (audioElement = activeAudio) => {
  if (audioElement && activeAudio && audioElement !== activeAudio) return;
  activeAudio = null;
  mouthLevel = 0;
  mouthWidth = 0;
  mouthRound = 0;
  mouthTeeth = 0;
  browLevel = 0;
  nodLevel = 0;
  lastRms = 0;
  avatarHost.style.setProperty("--avatar-y", "0px");
  avatarHost.style.setProperty("--avatar-rotate", "0deg");
  setPhotoBlink(avatarHost.querySelectorAll(".avatar-photo-lid"), 0);
  setAvatarExpression(false);
  if (avatarFrame !== null) {
    cancelAnimationFrame(avatarFrame);
    avatarFrame = null;
  }
  clearTimeout(blinkTimer);
  blinkSequence += 1;
};

const ensureAvatarAnalyser = async (audioElement) => {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  if (!avatarAnalyser) {
    avatarAnalyser = audioContext.createAnalyser();
    avatarAnalyser.fftSize = 256;
    avatarAnalyser.smoothingTimeConstant = 0.54;
    avatarData = new Uint8Array(avatarAnalyser.fftSize);
    avatarFreqData = new Uint8Array(avatarAnalyser.frequencyBinCount);
    avatarAnalyser.connect(audioContext.destination);
  }
  let source = audioSources.get(audioElement);
  if (!source) {
    source = audioContext.createMediaElementSource(audioElement);
    audioSources.set(audioElement, source);
  }
  if (connectedAvatarSource && connectedAvatarSource !== source) {
    try {
      connectedAvatarSource.disconnect();
    } catch (error) {
      /* Source may already be disconnected by the browser. */
    }
  }
  if (connectedAvatarSource !== source) {
    source.connect(avatarAnalyser);
    connectedAvatarSource = source;
  }
  return true;
};

const animateAvatar = () => {
  const sourceAudio = activeAudio;
  const now = performance.now();
  const idleY = Math.sin(now / 820) * 1.15;
  const idleRotate = Math.sin(now / 1100) * 1.5;

  if (!sourceAudio || sourceAudio.paused || sourceAudio.ended || sourceAudio.muted || !avatarAnalyser || !avatarData || !avatarFreqData) {
    avatarHost.style.setProperty("--avatar-y", `${idleY.toFixed(2)}px`);
    avatarHost.style.setProperty("--avatar-rotate", `${idleRotate.toFixed(2)}deg`);
    setAvatarExpression(false);
    avatarFrame = requestAnimationFrame(animateAvatar);
    return;
  }

  avatarAnalyser.getByteTimeDomainData(avatarData);
  avatarAnalyser.getByteFrequencyData(avatarFreqData);
  let sum = 0;
  for (let index = 0; index < avatarData.length; index += 1) {
    const normalized = (avatarData[index] - 128) / 128;
    sum += normalized * normalized;
  }
  const rms = Math.sqrt(sum / avatarData.length);
  const volume = clamp((rms - 0.01) * 14);
  const lowEnergy = averageBand(avatarFreqData, 0.03, 0.16);
  const midEnergy = averageBand(avatarFreqData, 0.16, 0.52);
  const highEnergy = averageBand(avatarFreqData, 0.52, 0.95);
  const voicedEnergy = clamp(midEnergy * 1.25 + lowEnergy * 0.35);
  const brightEnergy = clamp(highEnergy * 1.55);
  const wordShape = avatarTimingShape(sourceAudio);
  let roundTarget = clamp(voicedEnergy * 0.86 - brightEnergy * 0.32 + volume * 0.12);
  let mouthTarget = clamp(volume * 0.72 + voicedEnergy * 0.22 + brightEnergy * 0.1, 0, 0.92);
  let widthTarget = clamp(0.08 + brightEnergy * 0.34 + highEnergy * 0.28 + volume * 0.12, 0.08, 0.48);
  let teethTarget = clamp(brightEnergy * 0.16);

  if (wordShape.hasTiming) {
    if (wordShape.active) {
      mouthTarget = clamp(mouthTarget * 0.34 + wordShape.open * 0.7 + volume * 0.1, 0, 0.82);
      widthTarget = clamp(widthTarget * 0.38 + wordShape.wide * 0.66, 0.06, 0.46);
      roundTarget = clamp(roundTarget * 0.32 + wordShape.round * 0.72, 0, 0.88);
      teethTarget = clamp(wordShape.teeth * 0.55 + brightEnergy * 0.08, 0, 0.5);
    } else {
      mouthTarget = clamp(volume * 0.1, 0, 0.12);
      widthTarget = clamp(0.07 + brightEnergy * 0.06, 0.06, 0.14);
      roundTarget = clamp(roundTarget * 0.18, 0, 0.18);
      teethTarget = 0;
    }
  }

  const peak = volume - lastRms > 0.18;
  lastRms = volume;
  mouthLevel += (mouthTarget - mouthLevel) * (mouthTarget > mouthLevel ? 0.62 : 0.38);
  mouthWidth += (widthTarget - mouthWidth) * 0.42;
  mouthRound += (roundTarget - mouthRound) * 0.34;
  mouthTeeth += (teethTarget - mouthTeeth) * (teethTarget > mouthTeeth ? 0.46 : 0.34);
  browLevel += (volume - browLevel) * 0.18;
  nodLevel += ((peak ? 1 : 0) - nodLevel) * 0.32;
  const speakingY = idleY + (nodLevel * 1.4);
  const speakingRotate = idleRotate + (peak ? -1.1 : 0);
  avatarHost.style.setProperty("--avatar-y", `${speakingY.toFixed(2)}px`);
  avatarHost.style.setProperty("--avatar-rotate", `${speakingRotate.toFixed(2)}deg`);
  setAvatarExpression(true);
  avatarFrame = requestAnimationFrame(animateAvatar);
};

const startAvatar = async (audioElement = audio, speaker = activeEpisode || activeSpeaker) => {
  if (!audioElement || audioElement.muted) {
    stopAvatar();
    return;
  }

  if (activeAudio && activeAudio !== audioElement && !activeAudio.paused) {
    activeAudio.pause();
  }
  activeAudio = audioElement;

  const resolvedSpeaker = speaker || activeEpisode || activeSpeaker;
  if (resolvedSpeaker) {
    renderAvatarForSpeaker(resolvedSpeaker);
  }

  const ready = await ensureAvatarAnalyser(audioElement);
  if (!ready) return;
  if (avatarFrame !== null) cancelAnimationFrame(avatarFrame);
  scheduleBlink();
  animateAvatar();
};

const updateGlossaryTime = (state) => {
  const duration = state.audio.duration || 0;
  const current = state.audio.currentTime || 0;
  state.progress.value = duration ? String((current / duration) * 100) : "0";
  state.time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
};

const updateGlossaryPlayState = (tile) => {
  const state = glossaryAudioState.get(tile);
  if (!state) return;
  const playing = !state.audio.paused;
  state.playBtn.setAttribute("aria-label", playing ? config.audioPauseLabel : config.audioPlayLabel);
  state.playIcon.innerHTML = playing ? telecomIcon("tower") : telecomIcon("signal");
  tile.classList.toggle("is-playing", playing);
};

const updateGlossaryMuteState = (tile) => {
  const state = glossaryAudioState.get(tile);
  if (!state) return;
  const muted = state.audio.muted;
  state.muteBtn.setAttribute("aria-label", muted ? config.unmuteTitle : config.muteTitle);
  state.muteBtn.title = muted ? config.unmuteTitle : config.muteTitle;
  const assets = resolveAssets();
  setElementIcon(state.muteIcon, muted ? assets.ui.unmute : assets.ui.mute);
};

function closeGlossaryTile(tile) {
  const state = glossaryAudioState.get(tile);
  if (state) {
    clearTimeout(state.closeTimer);
    state.audio.pause();
    state.audio.currentTime = 0;
    stopAvatar(state.audio);
    updateGlossaryTime(state);
    updateGlossaryPlayState(tile);
  }
  tile.classList.remove("expanded", "is-playing");
  const trigger = tile.querySelector(".glossary-trigger");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (activeGlossaryTile === tile) activeGlossaryTile = null;
}

const expandGlossaryTile = async (tile) => {
  if (activeGlossaryTile && activeGlossaryTile !== tile) {
    closeGlossaryTile(activeGlossaryTile);
  }
  tile.classList.add("is-pressing");
  await wait(150);
  tile.classList.remove("is-pressing");
  tile.classList.add("expanded");
  tile.querySelector(".glossary-trigger").setAttribute("aria-expanded", "true");
  activeGlossaryTile = tile;
};

const createGlossaryPlayer = (tile, entry) => {
  const hasAudio = Boolean(entry.audio && entry.audio.trim());
  const player = document.createElement("div");
  player.className = hasAudio ? "glossary-player" : "glossary-player glossary-player--text-only";
  player.setAttribute("role", "group");
  player.setAttribute("aria-label", hasAudio ? config.audioPlayerLabel : config.glossaryCloseText);

  if (hasAudio) {
    player.innerHTML = `
      <button class="round-btn" type="button" aria-label="${escapeHtml(config.audioPlayLabel)}">
        <span class="glossary-play-icon"></span>
      </button>
      <button class="round-btn" type="button" aria-label="${escapeHtml(config.muteTitle)}" title="${escapeHtml(config.muteTitle)}">
        <span class="glossary-mute-icon"></span>
      </button>
      <div class="ranges">
        <input class="glossary-progress" type="range" min="0" max="100" value="0" aria-label="${escapeHtml(config.audioProgressLabel)}">
      </div>
      <span class="time" aria-live="polite">0:00 / 0:00</span>
      <button class="glossary-close" type="button">${escapeHtml(config.glossaryCloseText)}</button>
      <audio preload="metadata"></audio>
    `;
  } else {
    player.innerHTML = `
      <button class="glossary-close" type="button">${escapeHtml(config.glossaryCloseText)}</button>
    `;
  }

  const state = {
    audio: player.querySelector("audio"),
    playBtn: player.querySelector(".round-btn"),
    muteBtn: player.querySelectorAll(".round-btn")[1],
    playIcon: player.querySelector(".glossary-play-icon"),
    muteIcon: player.querySelector(".glossary-mute-icon"),
    progress: player.querySelector(".glossary-progress"),
    time: player.querySelector(".time"),
    closeTimer: null
  };

  if (hasAudio) {
    state.audio.src = entry.audio;
    glossaryAudioState.set(tile, state);
    const assets = resolveAssets();
    setElementIcon(state.playIcon, assets.ui.play);
    setElementIcon(state.muteIcon, assets.ui.mute);

    state.playBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (state.audio.paused) {
        try {
          await state.audio.play();
        } catch (error) {
          setGlossaryStatus(config.audioError);
        }
      } else {
        state.audio.pause();
      }
      updateGlossaryPlayState(tile);
    });

    state.muteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      state.audio.muted = !state.audio.muted;
      updateGlossaryMuteState(tile);
    });

    state.progress.addEventListener("input", () => {
      if (!state.audio.duration) return;
      state.audio.currentTime = (Number(state.progress.value) / 100) * state.audio.duration;
    });

    state.audio.addEventListener("play", () => {
      updateGlossaryPlayState(tile);
      startAvatar(state.audio, entry);
    });
    state.audio.addEventListener("pause", () => {
      updateGlossaryPlayState(tile);
      stopAvatar(state.audio);
    });
    state.audio.addEventListener("volumechange", () => {
      updateGlossaryMuteState(tile);
      if (state.audio.muted) {
        stopAvatar(state.audio);
      } else if (!state.audio.paused) {
        startAvatar(state.audio, entry);
      }
    });
    state.audio.addEventListener("loadedmetadata", () => updateGlossaryTime(state));
    state.audio.addEventListener("timeupdate", () => updateGlossaryTime(state));
    state.audio.addEventListener("error", () => {
      state.time.textContent = config.audioUnavailable;
    });
    state.audio.addEventListener("ended", () => {
      updateGlossaryPlayState(tile);
      stopAvatar(state.audio);
      if (config.glossaryAutoClose) {
        state.closeTimer = setTimeout(() => closeGlossaryTile(tile), 2000);
      }
    });
  }

  player.querySelector(".glossary-close").addEventListener("click", (event) => {
    event.stopPropagation();
    closeGlossaryTile(tile);
    tile.querySelector(".glossary-trigger").focus({ preventScroll: true });
  });

  return player;
};

const buildGlossaryTile = (entry, index) => {
  const article = document.createElement("article");
  article.className = "glossary-tile";
  article.dataset.id = entry.id || `glossary-${index}`;

  const trigger = document.createElement("button");
  trigger.className = "glossary-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", entry.title || config.glossaryTitle);
  trigger.innerHTML = `
    <span class="glossary-icon">${telecomIcon(entry.icon)}</span>
    <span>
      <span class="glossary-title">${escapeHtml(entry.title || config.glossaryTitle)}</span>
      <span class="glossary-snippet">${escapeHtml(glossarySnippet(entry.text))}</span>
    </span>
  `;

  const panel = document.createElement("div");
  panel.className = "glossary-panel";
  const inner = document.createElement("div");
  inner.className = "glossary-panel-inner";
  const detail = document.createElement("div");
  detail.className = "glossary-detail";
  detail.innerHTML = parseMarkdown(entry.text || config.errorTextMissing);
  inner.append(detail, createGlossaryPlayer(article, entry));
  panel.append(inner);
  article.append(trigger, panel);

  trigger.addEventListener("click", () => {
    if (article.classList.contains("expanded")) {
      closeGlossaryTile(article);
    } else {
      expandGlossaryTile(article);
    }
  });

  setTimeout(() => article.classList.add("ready"), reduceMotion.matches ? 0 : index * 60);
  return article;
};

const updateTime = () => {
  const duration = audio.duration || 0;
  const current = audio.currentTime || 0;
  progress.value = duration ? String((current / duration) * 100) : "0";
  timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
};

const setPlayState = () => {
  const playing = !audio.paused;
  const assets = resolveAssets();
  playBtn.setAttribute("aria-label", playing ? config.audioPauseLabel : config.audioPlayLabel);
  setElementIcon(playIcon, playing ? assets.ui.pause : assets.ui.play);
};

const setMuteState = () => {
  const muted = audio.muted;
  const assets = resolveAssets();
  muteBtn.setAttribute("aria-label", muted ? config.unmuteTitle : config.muteTitle);
  muteBtn.title = muted ? config.unmuteTitle : config.muteTitle;
  setElementIcon(muteIcon, muted ? assets.ui.unmute : assets.ui.mute);
};

const markdownCacheKey = (episode) => `${episode.id}:${episode.textUpdated || episode.text}`;

const fetchMarkdownHtml = async (episode) => {
  const cacheKey = markdownCacheKey(episode);
  if (markdownCache.has(cacheKey)) {
    return markdownCache.get(cacheKey);
  }

  try {
    const textUrl = assetCacheKey(episode, "text", episode.text);
    const response = await fetch(textUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const html = parseMarkdown(text);
    markdownCache.set(cacheKey, html);
    return html;
  } catch (error) {
    const fallback = `<p>${escapeHtml(config.errorTextMissing)}</p>`;
    markdownCache.set(cacheKey, fallback);
    return fallback;
  }
};

const buildCard = (episode, index) => {
  const article = document.createElement("article");
  article.className = "episode-card";
  article.dataset.id = episode.id;

  const imageButton = document.createElement("button");
  imageButton.className = "image-button";
  imageButton.type = "button";
  imageButton.setAttribute("aria-label", `${config.openEpisodeLabel}: ${episode.title}`);

  const cover = document.createElement("div");
  cover.className = "cover";

  const image = document.createElement("img");
  image.src = episode.image;
  image.alt = `${episode.title} cover image`;
  image.loading = index === 0 ? "eager" : "lazy";
  image.decoding = "async";
  if (index === 0) image.fetchPriority = "high";
  image.onerror = () => {
    cover.classList.add("has-error");
    if (!cover.querySelector(".image-fallback")) {
      cover.insertAdjacentHTML("afterbegin", `<div class="image-fallback">${escapeHtml(config.errorImageMissing)}</div>`);
    }
  };

  const title = document.createElement("div");
  title.className = "title-overlay";
  title.innerHTML = `<h2>${escapeHtml(episode.title)}</h2>${episode.date ? `<time datetime="${escapeHtml(episode.date)}">${escapeHtml(episode.date)}</time>` : ""}`;

  const quick = document.createElement("button");
  quick.className = "quick-view";
  quick.type = "button";
  quick.setAttribute("aria-label", `${config.quickViewTooltip}: ${episode.title}`);
  setElementIcon(quick, resolveAssets().ui.quickView);

  cover.append(image, title);
  imageButton.append(cover);
  article.append(imageButton, quick);

  imageButton.addEventListener("click", () => openEpisode(episode, article));
  imageButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      openEpisode(episode, article);
    }
  });
  quick.addEventListener("click", (event) => {
    event.stopPropagation();
    openQuickView(episode);
  });

  return article;
};

const loadConfig = async () => {
  try {
    const response = await fetch("config.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    config = { ...DEFAULT_CONFIG, ...(await response.json()) };
  } catch (error) {
    config = DEFAULT_CONFIG;
  }
  applyTheme();
  applyCopy();
};

const loadEpisodes = async ({ refresh = false } = {}) => {
  try {
    const response = await fetch("episodes.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    episodes = sortEpisodes(await response.json());
    grid.replaceChildren(...episodes.map(buildCard));

    if (!refresh) {
      skeleton.classList.add("fading");
      skeleton.setAttribute("aria-busy", "false");
      setTimeout(() => skeleton.classList.add("hidden"), motionDuration("skeletonFade"));
    } else {
      skeleton.classList.add("hidden");
      skeleton.setAttribute("aria-busy", "false");
      setStatus("");
    }

    grid.classList.remove("hidden");
    requestAnimationFrame(() => {
      document.querySelectorAll(".episode-card").forEach((card, index) => {
        setTimeout(() => card.classList.add("ready"), reduceMotion.matches ? 0 : index * 70);
      });
    });
    scheduleIdle(() => episodes.forEach((episode) => fetchMarkdownHtml(episode)));
  } catch (error) {
    skeleton.classList.add("hidden");
    skeleton.setAttribute("aria-busy", "false");
    setStatus(config.errorEpisodesMissing);
  }
};

const loadGlossary = async () => {
  if (glossaryEntries) return glossaryEntries;
  setGlossaryStatus(config.glossaryLoadingLabel);
  try {
    const response = await fetch("glossary.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
          glossaryEntries = await response.json();
          glossaryGrid.replaceChildren(...glossaryEntries.map(buildGlossaryTile));
    setGlossaryStatus(glossaryEntries.length ? "" : config.glossaryEmpty);
    return glossaryEntries;
  } catch (error) {
    glossaryEntries = [];
    glossaryGrid.replaceChildren();
    setGlossaryStatus(config.glossaryError);
    return glossaryEntries;
  }
};

const showGlossary = async () => {
  if (lightbox.classList.contains("active")) {
    await closeQuickView(false);
  }
  if (isExpanded) {
    await closeEpisode(false);
  }
  await loadGlossary();
  await switchView("glossary");
  document.querySelector("#top").scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
  glossaryBtn.focus({ preventScroll: true });
};

const viewportRect = () => ({
  left: 0,
  top: 0,
  width: window.innerWidth,
  height: window.innerHeight
});

const setShellRect = (rect) => {
  flipShell.style.left = `${rect.left}px`;
  flipShell.style.top = `${rect.top}px`;
  flipShell.style.width = `${rect.width}px`;
  flipShell.style.height = `${rect.height}px`;
};

const transformBetween = (from, to) => {
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  const translateX = to.left - from.left;
  const translateY = to.top - from.top;
  return `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`;
};

const normalizeShellTo = (rect) => {
  const previousTransition = flipShell.style.transition;
  flipShell.style.transition = "none";
  setShellRect(rect);
  flipShell.style.transform = "translate3d(0, 0, 0) scale(1)";
  flipShell.offsetHeight;
  flipShell.style.transition = previousTransition;
};

async function openEpisode(episode, sourceCard) {
  if (isExpanded || isClosing) return;
  isExpanded = true;
  activeEpisode = episode;
  activeSourceCard = sourceCard;
  clearTimeout(closeAudioTimer);

  const sourceRect = sourceCard.getBoundingClientRect();
  const targetRect = viewportRect();
  const htmlPromise = fetchMarkdownHtml(episode);
  const timingPromise = fetchEpisodeTiming(episode);

  frontFace.replaceChildren();
  const frontImage = document.createElement("img");
  frontImage.src = episode.image;
  frontImage.alt = `${episode.title} cover image`;
  frontImage.decoding = "async";
  frontFace.append(frontImage);
  expandedTitle.textContent = episode.title;
  expandedDate.textContent = episode.date || "";
  expandedDate.dateTime = episode.date || "";
  markdownBody.innerHTML = `<p>${escapeHtml(config.loadingText)}</p>`;
  markdownBody.dataset.highlighting = "false";
  pendingEstimatedHighlight = false;
  activeLine = null;
  if (episode.audio) {
    audio.src = assetCacheKey(episode, "audio", episode.audio);
  } else {
    audio.removeAttribute("src");
    audio.load();
  }
  audio.volume = Number(volume.value);
  updateTime();
  setPlayState();
  setMuteState();
  renderAvatarForSpeaker(episode);

  setShellRect(sourceRect);
  flipShell.style.transform = "translate3d(0, 0, 0) scale(1)";
  flipCard.classList.remove("flipped");
  flipLayer.classList.add("active");
  flipLayer.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-lock");
  setBackgroundInert(true);
  sourceCard.style.visibility = "hidden";
  flipCard.focus({ preventScroll: true });

  await wait(motionDuration("startDelay"));
  flipLayer.classList.add("shaded");
  flipShell.style.transform = transformBetween(sourceRect, targetRect);
  await wait(motionDuration("expand"));
  normalizeShellTo(targetRect);
  flipCard.classList.add("flipped");
  markdownBody.innerHTML = await htmlPromise;
  const timing = await timingPromise;
  await waitForAudioDuration();
  if (timing.length) {
    applyHighlightTiming(timing);
  } else {
    enableEstimatedHighlighting();
  }
  if (!audio.paused) {
    startHighlightLoop();
  }
  await wait(motionDuration("flip"));
  backBtn.focus();
}

async function closeEpisode(restoreFocus = true) {
  if (!isExpanded || isClosing || !activeSourceCard) return;
  isClosing = true;
  clearTimeout(closeAudioTimer);
  audio.pause();
  audio.currentTime = 0;
  setPlayState();
  stopAvatar(audio);
  if (activeLine) activeLine.classList.remove("active");
  activeLine = null;
  markdownBody.dataset.highlighting = "false";
  pendingEstimatedHighlight = false;
  activeTiming = [];
  avatarTiming = [];
  avatarTimingIndex = 0;
  stopHighlightLoop();

  const sourceRect = activeSourceCard.getBoundingClientRect();
  const targetRect = viewportRect();
  flipCard.classList.remove("flipped");
  await wait(motionDuration("flip"));
  normalizeShellTo(targetRect);
  flipShell.style.transform = transformBetween(targetRect, sourceRect);
  flipLayer.classList.remove("shaded");
  await wait(motionDuration("expand"));

  activeSourceCard.style.visibility = "";
  if (restoreFocus) {
    activeSourceCard.querySelector(".image-button").focus({ preventScroll: true });
    activeSourceCard.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
  }
  flipLayer.classList.remove("active");
  flipLayer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-lock");
  setBackgroundInert(false);
  frontFace.replaceChildren();
  audio.removeAttribute("src");
  audio.load();
  activeSourceCard = null;
  isExpanded = false;
  isClosing = false;
  activeEpisode = null;
  activeSpeaker = null;
  avatarHost.innerHTML = "";
  avatarHost.classList.remove("speaking");
}

function openQuickView(episode) {
  closeQuickView(false);
  previousFocus = document.activeElement;
  lightboxImage.src = episode.image;
  lightboxImage.alt = `${episode.title} cover image`;
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  lightbox.setAttribute("aria-label", `${config.quickViewTooltip}: ${episode.title}`);
  document.body.classList.add("modal-lock");
  setBackgroundInert(true);
  requestAnimationFrame(() => lightbox.classList.add("visible"));
  lightbox.focus({ preventScroll: true });
  quickTimer = setTimeout(() => closeQuickView(), TIMING.quickView);
}

async function closeQuickView(animate = true) {
  clearTimeout(quickTimer);
  if (!lightbox.classList.contains("active")) return;
  lightbox.classList.remove("visible");
  if (animate) await wait(motionDuration("fade"));
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.removeAttribute("src");
  document.body.classList.remove("modal-lock");
  setBackgroundInert(false);
  if (previousFocus && typeof previousFocus.focus === "function") {
    previousFocus.focus({ preventScroll: true });
  }
  previousFocus = null;
}

playBtn.addEventListener("click", async () => {
  if (!audio.src) return;
  if (audio.paused) {
    try {
      await audio.play();
      await startAvatar(audio, activeEpisode);
    } catch (error) {
      setStatus(config.audioError);
    }
  } else {
    audio.pause();
  }
  setPlayState();
});
muteBtn.addEventListener("click", () => {
  audio.muted = !audio.muted;
  setMuteState();
  if (audio.muted) {
    stopAvatar(audio);
  } else if (!audio.paused) {
    startAvatar(audio, activeEpisode);
  }
});

backBtn.addEventListener("click", async () => {
  await closeEpisode();
});
readerHomeBtn.addEventListener("click", goHome);
homeBtn.addEventListener("click", goHome);
glossaryBtn.addEventListener("click", showGlossary);
audio.addEventListener("play", () => {
  setPlayState();
  startAvatar(audio, activeEpisode);
  startHighlightLoop();
});
audio.addEventListener("pause", () => {
  setPlayState();
  stopAvatar(audio);
  stopHighlightLoop();
});
audio.addEventListener("volumechange", () => {
  setMuteState();
  if (audio.muted) {
    stopAvatar(audio);
  } else if (!audio.paused) {
    startAvatar(audio, activeEpisode);
  }
});
audio.addEventListener("loadedmetadata", () => {
  updateTime();
  if (pendingEstimatedHighlight) {
    enableEstimatedHighlighting();
  } else if (isExpanded && activeTiming.length && markdownBody.dataset.highlighting === "true") {
    applyHighlightTiming(activeTiming);
  }
});
audio.addEventListener("timeupdate", () => {
  updateTime();
});
audio.addEventListener("seeked", requestLineHighlight);
audio.addEventListener("error", () => {
  timeDisplay.textContent = config.audioUnavailable;
});
audio.addEventListener("ended", () => {
  stopAvatar(audio);
  closeAudioTimer = setTimeout(() => {
    if (isExpanded) closeEpisode();
  }, TIMING.autoReturnDelay);
});

progress.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  updateLineHighlight();
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeQuickView();
});
lightbox.addEventListener("touchstart", (event) => {
  quickTouchY = event.changedTouches[0].clientY;
}, { passive: true });
lightbox.addEventListener("touchend", (event) => {
  if (quickTouchY !== null && event.changedTouches[0].clientY - quickTouchY > SWIPE_DISMISS_DISTANCE) {
    closeQuickView();
  }
  quickTouchY = null;
}, { passive: true });

flipLayer.addEventListener("touchstart", (event) => {
  flipTouchY = event.changedTouches[0].clientY;
}, { passive: true });
flipLayer.addEventListener("touchend", (event) => {
  if (flipTouchY !== null && event.changedTouches[0].clientY - flipTouchY > SWIPE_DISMISS_DISTANCE) {
    closeEpisode();
  }
  flipTouchY = null;
}, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (lightbox.classList.contains("active")) {
      closeQuickView();
      return;
    }
    if (isExpanded) closeEpisode();
  }

  if (event.code === "Space" && isExpanded) {
    event.preventDefault();
    playBtn.click();
  }

  if (event.key === "Tab" && isExpanded) {
    const focusable = flipCard.querySelectorAll("button, input, a");
    const items = Array.from(focusable).filter((item) => !item.disabled);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

const syncExpandedPosition = () => {
  resizeFrame = null;
  if (!isExpanded || !activeSourceCard) return;
  normalizeShellTo(viewportRect());
};

window.addEventListener("resize", () => {
  if (resizeFrame !== null) return;
  resizeFrame = requestAnimationFrame(syncExpandedPosition);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (currentView !== "episodes" || isExpanded || isClosing) return;
  loadEpisodes({ refresh: true });
});

const init = async () => {
  await loadConfig();
  await preloadAssets();
  applyAssets();
  await loadEpisodes();
};

init();
