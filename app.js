// ===== basic error surfacing so you see issues immediately =====
window.addEventListener('error', (e) => {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'JS error: ' + (e.message || 'unknown');
});

// ===== DOM refs =====
const rowsEl = document.getElementById('rows');
const colsEl = document.getElementById('cols');
const cellSizeEl = document.getElementById('cellSize');
const fontSizeEl = document.getElementById('fontSize');
const fontFamilyEl = document.getElementById('fontFamily');
const symbolEl = document.getElementById('symbol');
const modeEl = document.getElementById('mode');
const imgRow = document.getElementById('imgRow');
const imgInput = document.getElementById('imgInput');
const clearBtn = document.getElementById('clearBtn');
const pngBtn = document.getElementById('pngBtn');
const pdfBtn = document.getElementById('pdfBtn');
const statusEl = document.getElementById('status');

// Picker refs
const tabEmoji = document.getElementById('tabEmoji');
const tabHiero = document.getElementById('tabHiero');
const pickerSearch = document.getElementById('pickerSearch');
const pickerCats = document.getElementById('pickerCats');
const pickerGrid = document.getElementById('pickerGrid');

// NEW: category header refs (you must add these elements in HTML)
const catTitleEl = document.getElementById('catTitle');
const catSubtitleEl = document.getElementById('catSubtitle');

// Canvas
const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');

// ===== Matrix state =====
let R = +rowsEl.value;
let C = +colsEl.value;
let cellSize = +cellSizeEl.value;
let fontPx = +fontSizeEl.value;
let fontFamily = fontFamilyEl.value;
let currentImg = null;

// matrix[r][c] = null | {type:'char', value:string} | {type:'img', img:Image}
let matrix = makeEmpty(R, C);

function makeEmpty(r, c) {
  return Array.from({ length: r }, () => Array.from({ length: c }, () => null));
}

function resizeCanvas() {
  canvas.width = C * cellSize;
  canvas.height = R * cellSize;
}

function draw() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  for (let i = 0; i <= R; i++) {
    const y = i * cellSize + 0.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  for (let j = 0; j <= C; j++) {
    const x = j * cellSize + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.font =
    `${fontPx}px "${fontFamily}", ` +
    `"Noto Sans Egyptian Hieroglyphs", "Noto Sans", "Noto Sans Symbols 2", ` +
    `"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const cell = matrix[r][c];
      const cx = c * cellSize + cellSize / 2;
      const cy = r * cellSize + cellSize / 2;

      if (!cell) continue;

      if (cell.type === 'char') {
        ctx.fillText(cell.value, cx, cy);
      } else if (cell.type === 'img' && cell.img.complete) {
        const img = cell.img;
        const scale = Math.min(cellSize / img.width, cellSize / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
      }
    }
  }
}

function rebuildMatrixPreserve() {
  const newM = makeEmpty(R, C);
  const rMin = Math.min(R, matrix.length);
  const cMin = Math.min(C, matrix[0].length);
  for (let r = 0; r < rMin; r++) {
    for (let c = 0; c < cMin; c++) {
      newM[r][c] = matrix[r][c];
    }
  }
  matrix = newM;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function applyDimensions() {
  R = clamp(+rowsEl.value, 1, 500);
  C = clamp(+colsEl.value, 1, 500);
  cellSize = clamp(+cellSizeEl.value, 10, 200);
  fontPx = clamp(+fontSizeEl.value, 6, 400);
  fontFamily = fontFamilyEl.value || 'Noto Sans';

  rebuildMatrixPreserve();
  resizeCanvas();
  draw();
  status(`Canvas: ${canvas.width}×${canvas.height}px`);
}

function status(msg) { statusEl.textContent = msg; }

// ===== Canvas interactions =====
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const c = Math.floor(x / cellSize);
  const r = Math.floor(y / cellSize);
  if (r < 0 || r >= R || c < 0 || c >= C) return;

  const mode = modeEl.value;
  if (mode === 'char') {
    const sym = symbolEl.value;
    if (!sym) return;
    matrix[r][c] = { type: 'char', value: sym };
  } else if (mode === 'img') {
    if (!currentImg) { status('Upload an image first'); return; }
    matrix[r][c] = { type: 'img', img: currentImg };
  } else if (mode === 'erase') {
    matrix[r][c] = null;
  }
  draw();
});

rowsEl.addEventListener('change', applyDimensions);
colsEl.addEventListener('change', applyDimensions);
cellSizeEl.addEventListener('change', applyDimensions);
fontSizeEl.addEventListener('change', applyDimensions);
fontFamilyEl.addEventListener('change', () => { fontFamily = fontFamilyEl.value; draw(); });

modeEl.addEventListener('change', () => {
  imgRow.style.display = modeEl.value === 'img' ? '' : 'none';
});

imgInput.addEventListener('change', () => {
  const file = imgInput.files && imgInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => { currentImg = img; status('Image loaded'); };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

clearBtn.addEventListener('click', () => {
  matrix = makeEmpty(R, C);
  draw();
});

pngBtn.addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matrix.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
});

pdfBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const imgData = canvas.toDataURL('image/png');
  const scale = Math.min((pageW - 2 * margin) / canvas.width, (pageH - 2 * margin) / canvas.height);
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;
  pdf.addImage(imgData, 'PNG', x, y, w, h);
  pdf.save('matrix.pdf');
});

// // ===== Picker (NO imports; works on file://) =====
// const RECENTS_KEY = 'matrixPainter.recents.v3';
// const MAX_RECENTS = 48;

// function loadRecents() {
//   try {
//     const raw = localStorage.getItem(RECENTS_KEY);
//     const arr = raw ? JSON.parse(raw) : [];
//     return Array.isArray(arr) ? arr : [];
//   } catch { return []; }
// }

// function saveRecents(arr) {
//   try { localStorage.setItem(RECENTS_KEY, JSON.stringify(arr)); } catch {}
// }

// function pushRecent(type, value) {
//   const recents = loadRecents();
//   const filtered = recents.filter(x => !(x && x.type === type && x.value === value));
//   filtered.unshift({ type, value, t: Date.now() });
//   saveRecents(filtered.slice(0, MAX_RECENTS));
// }

// function getRecentsFor(type) {
//   return loadRecents()
//     .filter(x => x && x.type === type && typeof x.value === 'string')
//     .map(x => x.value);
// }

// function setSymbolFromPicker(sym) {
//   symbolEl.value = sym;
//   modeEl.value = 'char';
//   imgRow.style.display = 'none';
//   status(`Selected: ${sym}`);
// }

// function renderSymbols(symbols, { type }) {
//   pickerGrid.innerHTML = '';
//   const frag = document.createDocumentFragment();
//   for (const sym of symbols) {
//     const btn = document.createElement('button');
//     btn.type = 'button';
//     btn.className = 'symBtn';
//     btn.textContent = sym;
//     btn.title = sym;
//     btn.addEventListener('click', () => {
//       setSymbolFromPicker(sym);
//       pushRecent(type, sym);
//     });
//     frag.appendChild(btn);
//   }
//   pickerGrid.appendChild(frag);
// }

// // Split into *grapheme clusters* (keeps flags, ZWJ sequences intact)
// const _seg = ('Segmenter' in Intl) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
// function splitGraphemes(str) {
//   if (_seg) return [..._seg.segment(str)].map(x => x.segment);
//   return Array.from(str);
// }

// // WhatsApp-like emoji category icons
// const EMOJI_CATS = [
//   { key: 'recent',  icon: '🕘', label: 'Recent' },
//   { key: 'smileys', icon: '😃', label: 'Smileys' },
//   { key: 'people',  icon: '🧑', label: 'People' },
//   { key: 'animals', icon: '🐻', label: 'Animals' },
//   { key: 'food',    icon: '🍔', label: 'Food' },
//   { key: 'activity',icon: '⚽', label: 'Activity' },
//   { key: 'travel',  icon: '🚀', label: 'Travel' },
//   { key: 'objects', icon: '💡', label: 'Objects' },
//   { key: 'symbols', icon: '💕', label: 'Symbols' },
//   { key: 'flags',   icon: '🎌', label: 'Flags' },
// ];

// // Offline emoji lists
// const EMOJI = {
//   smileys: splitGraphemes("😀😁😂🤣😃😄😅😆😉😊😋😎😍😘😗😙😚🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫🥱😴😌😛😜😝🤤😒😓😔😕🙃🫠🫢🤭🤫🤥😳🥴😵🤯😠😡🤬😢😭😤😱😨😰😲🥶🥵🤢🤮🤧😷🤒🤕🤑🤠🥳😇🤓🫡"),
//   people:  splitGraphemes("🧑👶👧🧒👦👩👨🧔‍♂️🧔‍♀️👵👴🧓👱‍♀️👱‍♂️👩‍🦰👨‍🦰👩‍🦱👨‍🦱👩‍🦳👨‍🦳👩‍🦲👨‍🦲👮‍♀️👮‍♂️🕵️‍♀️🕵️‍♂️💂‍♀️💂‍♂️👷‍♀️👷‍♂️👩‍⚕️👨‍⚕️👩‍🍳👨‍🍳👩‍🎓👨‍🎓👩‍🏫👨‍🏫👩‍💻👨‍💻👩‍🚀👨‍🚀👩‍🎨👨‍🎨🙋‍♀️🙋‍♂️🙆‍♀️🙆‍♂️🙅‍♀️🙅‍♂️🙇‍♀️🙇‍♂️🤝👍👎👏🙌🫶🤲🤜🤛✊🤞✌️🤟🤘👌🫰🖐️✋🫱🫲"),
//   animals: splitGraphemes("🐶🐱🐭🐹🐰🦊🐻🐼🐻‍❄️🐨🐯🦁🐮🐷🐽🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🦆🦅🦉🦇🐺🐗🐴🦄🐝🪲🦋🐛🐌🐞🪰🪳🕷️🦂🐢🐍🦎🐙🦑🦐🦞🦀🐠🐟🐡🦈🐬🐳🐋🦭🦊🦝🦓🦒🦘🦬🦛🦏🐘🐪🐫🦙🦥🦦🦨"),
//   food:    splitGraphemes("🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶️🫑🌽🥕🧄🧅🥔🍠🫘🥜🌰🍞🥐🥖🫓🥨🥯🧀🥚🍳🥞🧇🥓🍗🍖🌭🍔🍟🍕🥪🌮🌯🫔🥙🧆🍝🍜🍣🍤🥟🍱🍛🍚🍙🍘🍥🥠🍦🍨🍰🧁🍫🍩🍪"),
//   activity:splitGraphemes("⚽🏀🏈⚾🎾🏐🏉🥏🎱🏓🏸🥅⛳🏹🎣🥊🥋⛸️🎿🏂🪂🏋️‍♀️🏋️‍♂️🤼‍♀️🤼‍♂️🤸‍♀️🤸‍♂️⛹️‍♀️⛹️‍♂️🏃‍♀️🏃‍♂️🚴‍♀️🚴‍♂️🧗‍♀️🧗‍♂️🧘‍♀️🧘‍♂️🏊‍♀️🏊‍♂️🤽‍♀️🤽‍♂️🤾‍♀️🤾‍♂️🎮🎲🎯🎳🎻🎸🎹🥁🎺🎷"),
//   travel:  splitGraphemes("🚗🚕🚙🚌🚎🏎️🚓🚑🚒🚐🛻🚚🚛🚜🛵🏍️🚲🛴🚨🚔🚍✈️🛩️🛫🛬🪂🚀🛰️🛸⛵🚤🛥️🛳️🚢🚁🚂🚃🚄🚅🚆🚇🚈🚉🗺️🧭🏔️⛰️🌋🗻🏕️🏖️🏜️🏝️🏟️🏛️🏗️🗽🗼🏰🏯⛩️🕍🕌"),
//   objects: splitGraphemes("⌚📱💻🖥️🖨️🧮📷📸🎥📹📺📻🎙️🎚️🎛️💡🔦🕯️🧯🔌🔋🪫📞📟📠🧲🧪🧫🧬🔬🔭📡🧰🔧🔨⚙️🪛🪚🧱🧹🧺🧻🪣🧼🪥🛁🛏️🛋️🚪🪟🧸🎁🎈📦📚📌📎✂️🗑️🔑💳💰"),
//   symbols: splitGraphemes("❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟☮️✝️☪️🕉️☸️✡️🔯🪬⚛️🈶🈚🈸🈺🈷️🈂️🈁🆚🆗🆙🆒🆕🆓✅☑️✔️✖️❌❗❓‼️⁉️🔴🟠🟡🟢🔵🟣⚪⚫🔺🔻⭐🌟✨⚡🔥💥☀️🌙☁️"),
//   flags:   splitGraphemes("🇮🇱🇺🇸🇬🇧🇩🇪🇫🇷🇪🇸🇮🇹🇯🇵🇰🇷🇨🇳🇷🇺🇺🇦🇵🇱🇳🇱🇧🇪🇨🇦🇦🇺🇧🇷🇲🇽🇸🇪🇳🇴🇩🇰🇫🇮🇨🇭🇦🇹🇬🇷🇹🇷🇪🇬🇸🇦🇦🇪🇮🇳🇹🇭🇻🇳🇸🇬🇭🇰🇹🇼🇿🇦🇳🇿🇮🇪🇵🇹🇨🇿🇭🇺🇷🇴"),
// };

// // Named Egyptian hieroglyph categories (Gardiner-style)
// const HIERO_GARDINER_CATEGORIES = [
//   { key: "A",  name: "Man and his occupations",                         start: 0x13000, end: 0x1304F },
//   { key: "B",  name: "Woman and her occupations",                       start: 0x13050, end: 0x13059 },
//   { key: "C",  name: "Anthropomorphic deities",                         start: 0x1305A, end: 0x13075 },
//   { key: "D",  name: "Parts of the human body",                         start: 0x13076, end: 0x130D1 },
//   { key: "E",  name: "Mammals",                                         start: 0x130D2, end: 0x130FD },
//   { key: "F",  name: "Parts of mammals",                                start: 0x130FE, end: 0x1313E },
//   { key: "G",  name: "Birds",                                           start: 0x1313F, end: 0x1317E },
//   { key: "H",  name: "Parts of birds",                                  start: 0x1317F, end: 0x13187 },
//   { key: "I",  name: "Amphibious animals, reptiles, etc.",              start: 0x13188, end: 0x1319A },
//   { key: "K",  name: "Fish and parts of fish",                          start: 0x1319B, end: 0x131A2 },
//   { key: "L",  name: "Invertebrates and lesser animals",                start: 0x131A3, end: 0x131AC },
//   { key: "M",  name: "Trees and plants",                                start: 0x131AD, end: 0x131EE },
//   { key: "N",  name: "Sky, earth, water",                               start: 0x131EF, end: 0x1324F },
//   { key: "O",  name: "Buildings, parts of buildings, etc.",             start: 0x13250, end: 0x1329A },
//   { key: "P",  name: "Ships and parts of ships",                        start: 0x1329B, end: 0x132A7 },
//   { key: "Q",  name: "Domestic and funerary furniture",                 start: 0x132A8, end: 0x132AE },
//   { key: "R",  name: "Temple furniture and sacred emblems",             start: 0x132AF, end: 0x132D0 },
//   { key: "S",  name: "Crowns, dress, staves, etc.",                     start: 0x132D1, end: 0x13306 },
//   { key: "T",  name: "Warfare, hunting, and butchery",                  start: 0x13307, end: 0x13332 },
//   { key: "U",  name: "Agriculture, crafts, and professions",            start: 0x13333, end: 0x13361 },
//   { key: "V",  name: "Rope, fiber, baskets, bags, etc.",                start: 0x13362, end: 0x133AE },
//   { key: "W",  name: "Vessels of stone and earthenware",                start: 0x133AF, end: 0x133CE },
//   { key: "X",  name: "Loaves and cakes",                                start: 0x133CF, end: 0x133DA },
//   { key: "Y",  name: "Writings, games, music",                          start: 0x133DB, end: 0x133E3 },
//   { key: "Z",  name: "Strokes (incl. hieratic/geometric figures)",      start: 0x133E4, end: 0x1340C },
//   { key: "Aa", name: "Unclassified",                                    start: 0x1340D, end: 0x1342F },
// ];

// function codepointsToChars(start, end) {
//   const out = [];
//   for (let cp = start; cp <= end; cp++) out.push(String.fromCodePoint(cp));
//   return out;
// }

// function hexU(cp) {
//   return 'U+' + cp.toString(16).toUpperCase();
// }

// // NEW: header updater (WhatsApp-like)
// function setCategoryHeader(title, subtitle = '') {
//   if (catTitleEl) catTitleEl.textContent = title;
//   if (catSubtitleEl) catSubtitleEl.textContent = subtitle;
// }

// let pickerType = 'emoji'; // 'emoji' | 'hiero'
// let activeCatKey = null;

// // Tabs
// function setActiveTab(type) {
//   pickerType = type;
//   tabEmoji.classList.toggle('active', type === 'emoji');
//   tabHiero.classList.toggle('active', type === 'hiero');

//   // offline: search disabled
//   pickerSearch.disabled = true;
//   pickerSearch.value = '';
//   pickerSearch.placeholder = 'Search disabled in offline picker';
// }

// // Build category buttons (left column)
// function buildCatsForEmoji() {
//   pickerCats.innerHTML = '';
//   for (const cat of EMOJI_CATS) {
//     const btn = document.createElement('button');
//     btn.type = 'button';
//     btn.className = 'catBtn';
//     btn.textContent = cat.icon;
//     btn.title = cat.label;
//     btn.dataset.key = cat.key;
//     btn.addEventListener('click', () => activateCategory(cat.key));
//     pickerCats.appendChild(btn);
//   }
// }

// // FIXED: hieroglyph categories are ICON/LETTER ONLY (no clipped text)
// function buildCatsForHiero() {
//   pickerCats.innerHTML = '';

//   // Recent icon only
//   const recentBtn = document.createElement('button');
//   recentBtn.type = 'button';
//   recentBtn.className = 'catBtn';
//   recentBtn.textContent = '🕘';
//   recentBtn.title = 'Recent';
//   recentBtn.dataset.key = 'recent';
//   recentBtn.addEventListener('click', () => activateCategory('recent'));
//   pickerCats.appendChild(recentBtn);

//   // A, B, C, ... Aa (letter only)
//   for (const cat of HIERO_GARDINER_CATEGORIES) {
//     const btn = document.createElement('button');
//     btn.type = 'button';
//     btn.className = 'catBtn hieroIcon' + (cat.key === 'Aa' ? ' aa' : '');
//     btn.textContent = cat.key;
//     btn.title = `${cat.key}: ${cat.name}`;
//     btn.dataset.key = cat.key;
//     btn.addEventListener('click', () => activateCategory(cat.key));
//     pickerCats.appendChild(btn);
//   }
// }

// function markActiveCat(key) {
//   activeCatKey = key;
//   [...pickerCats.querySelectorAll('.catBtn')].forEach(b => {
//     b.classList.toggle('active', b.dataset.key === key);
//   });
// }

// function activateCategory(key) {
//   markActiveCat(key);

//   if (pickerType === 'emoji') {
//     if (key === 'recent') {
//       setCategoryHeader('Recent', 'Last used');
//       const rec = getRecentsFor('emoji');
//       renderSymbols(rec.length ? rec : EMOJI.smileys.slice(0, 40), { type: 'emoji' });
//       return;
//     }
//     const cat = EMOJI_CATS.find(c => c.key === key);
//     setCategoryHeader(cat ? cat.label : 'Emoji', '');
//     const list = EMOJI[key];
//     renderSymbols(list ? list : EMOJI.smileys, { type: 'emoji' });
//     return;
//   }

//   // hieroglyphs
//   if (key === 'recent') {
//     setCategoryHeader('Recent', 'Last used');
//     const rec = getRecentsFor('hiero');
//     renderSymbols(rec.length ? rec : [String.fromCodePoint(0x13000)], { type: 'hiero' });
//     return;
//   }

//   const cat = HIERO_GARDINER_CATEGORIES.find(c => c.key === key);
//   if (!cat) return;

//   setCategoryHeader(`${cat.key}: ${cat.name}`, `${hexU(cat.start)} – ${hexU(cat.end)}`);
//   renderSymbols(codepointsToChars(cat.start, cat.end), { type: 'hiero' });
// }

// // Tab events
// tabEmoji.addEventListener('click', () => {
//   setActiveTab('emoji');
//   buildCatsForEmoji();
//   activateCategory('smileys');
// });

// tabHiero.addEventListener('click', () => {
//   setActiveTab('hiero');
//   buildCatsForHiero();
//   activateCategory('A');
// });

// // ===== init =====
// applyDimensions();
// setActiveTab('emoji');
// buildCatsForEmoji();
// activateCategory('smileys');
// ===== Picker (online-capable) =====
const RECENTS_KEY = 'matrixPainter.recents.v3';
const MAX_RECENTS = 48;

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveRecents(arr) {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(arr)); } catch {}
}

function pushRecent(type, value) {
  const recents = loadRecents();
  const filtered = recents.filter(x => !(x && x.type === type && x.value === value));
  filtered.unshift({ type, value, t: Date.now() });
  saveRecents(filtered.slice(0, MAX_RECENTS));
}

function getRecentsFor(type) {
  return loadRecents()
    .filter(x => x && x.type === type && typeof x.value === 'string')
    .map(x => x.value);
}

function setSymbolFromPicker(sym) {
  symbolEl.value = sym;
  modeEl.value = 'char';
  imgRow.style.display = 'none';
  status(`Selected: ${sym}`);
}

function renderSymbols(symbols, { type }) {
  pickerGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const sym of symbols) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'symBtn';
    btn.textContent = sym;
    btn.title = sym;
    btn.addEventListener('click', () => {
      setSymbolFromPicker(sym);
      pushRecent(type, sym);
    });
    frag.appendChild(btn);
  }
  pickerGrid.appendChild(frag);
}

function setCategoryHeader(title, subtitle = '') {
  if (catTitleEl) catTitleEl.textContent = title;
  if (catSubtitleEl) catSubtitleEl.textContent = subtitle;
}

// ===== Split emoji into graphemes for offline fallback =====
const _seg = ('Segmenter' in Intl) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
function splitGraphemes(str) {
  if (_seg) return [..._seg.segment(str)].map(x => x.segment);
  return Array.from(str);
}

// WhatsApp-like emoji category icons
const EMOJI_CATS = [
  { key: 'recent',  icon: '🕘', label: 'Recent' },
  { key: 'smileys', icon: '😃', label: 'Smileys' },
  { key: 'people',  icon: '🧑', label: 'People' },
  { key: 'animals', icon: '🐻', label: 'Animals' },
  { key: 'food',    icon: '🍔', label: 'Food' },
  { key: 'activity',icon: '⚽', label: 'Activity' },
  { key: 'travel',  icon: '🚀', label: 'Travel' },
  { key: 'objects', icon: '💡', label: 'Objects' },
  { key: 'symbols', icon: '💕', label: 'Symbols' },
  { key: 'flags',   icon: '🎌', label: 'Flags' },
];

// Offline emoji fallback lists (yours)
const EMOJI_OFFLINE = {
  smileys: splitGraphemes("😀😁😂🤣😃😄😅😆😉😊😋😎😍😘😗😙😚🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫🥱😴😌😛😜😝🤤😒😓😔😕🙃🫠🫢🤭🤫🤥😳🥴😵🤯😠😡🤬😢😭😤😱😨😰😲🥶🥵🤢🤮🤧😷🤒🤕🤑🤠🥳😇🤓🫡"),
  people:  splitGraphemes("🧑👶👧🧒👦👩👨🧔‍♂️🧔‍♀️👵👴🧓👱‍♀️👱‍♂️👩‍🦰👨‍🦰👩‍🦱👨‍🦱👩‍🦳👨‍🦳👩‍🦲👨‍🦲👮‍♀️👮‍♂️🕵️‍♀️🕵️‍♂️💂‍♀️💂‍♂️👷‍♀️👷‍♂️👩‍⚕️👨‍⚕️👩‍🍳👨‍🍳👩‍🎓👨‍🎓👩‍🏫👨‍🏫👩‍💻👨‍💻👩‍🚀👨‍🚀👩‍🎨👨‍🎨🙋‍♀️🙋‍♂️🙆‍♀️🙆‍♂️🙅‍♀️🙅‍♂️🙇‍♀️🙇‍♂️🤝👍👎👏🙌🫶🤲🤜🤛✊🤞✌️🤟🤘👌🫰🖐️✋🫱🫲"),
  animals: splitGraphemes("🐶🐱🐭🐹🐰🦊🐻🐼🐻‍❄️🐨🐯🦁🐮🐷🐽🐸🐵🙈🙉🙊🐒🐔🐧🐦🐤🐣🦆🦅🦉🦇🐺🐗🐴🦄🐝🪲🦋🐛🐌🐞🪰🪳🕷️🦂🐢🐍🦎🐙🦑🦐🦞🦀🐠🐟🐡🦈🐬🐳🐋🦭🦊🦝🦓🦒🦘🦬🦛🦏🐘🐪🐫🦙🦥🦦🦨"),
  food:    splitGraphemes("🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶️🫑🌽🥕🧄🧅🥔🍠🫘🥜🌰🍞🥐🥖🫓🥨🥯🧀🥚🍳🥞🧇🥓🍗🍖🌭🍔🍟🍕🥪🌮🌯🫔🥙🧆🍝🍜🍣🍤🥟🍱🍛🍚🍙🍘🍥🥠🍦🍨🍰🧁🍫🍩🍪"),
  activity:splitGraphemes("⚽🏀🏈⚾🎾🏐🏉🥏🎱🏓🏸🥅⛳🏹🎣🥊🥋⛸️🎿🏂🪂🏋️‍♀️🏋️‍♂️🤼‍♀️🤼‍♂️🤸‍♀️🤸‍♂️⛹️‍♀️⛹️‍♂️🏃‍♀️🏃‍♂️🚴‍♀️🚴‍♂️🧗‍♀️🧗‍♂️🧘‍♀️🧘‍♂️🏊‍♀️🏊‍♂️🤽‍♀️🤽‍♂️🤾‍♀️🤾‍♂️🎮🎲🎯🎳🎻🎸🎹🥁🎺🎷"),
  travel:  splitGraphemes("🚗🚕🚙🚌🚎🏎️🚓🚑🚒🚐🛻🚚🚛🚜🛵🏍️🚲🛴🚨🚔🚍✈️🛩️🛫🛬🪂🚀🛰️🛸⛵🚤🛥️🛳️🚢🚁🚂🚃🚄🚅🚆🚇🚈🚉🗺️🧭🏔️⛰️🌋🗻🏕️🏖️🏜️🏝️🏟️🏛️🏗️🗽🗼🏰🏯⛩️🕍🕌"),
  objects: splitGraphemes("⌚📱💻🖥️🖨️🧮📷📸🎥📹📺📻🎙️🎚️🎛️💡🔦🕯️🧯🔌🔋🪫📞📟📠🧲🧪🧫🧬🔬🔭📡🧰🔧🔨⚙️🪛🪚🧱🧹🧺🧻🪣🧼🪥🛁🛏️🛋️🚪🪟🧸🎁🎈📦📚📌📎✂️🗑️🔑💳💰"),
  symbols: splitGraphemes("❤️🧡💛💚💙💜🖤🤍🤎💔❣️💕💞💓💗💖💘💝💟☮️✝️☪️🕉️☸️✡️🔯🪬⚛️🈶🈚🈸🈺🈷️🈂️🈁🆚🆗🆙🆒🆕🆓✅☑️✔️✖️❌❗❓‼️⁉️🔴🟠🟡🟢🔵🟣⚪⚫🔺🔻⭐🌟✨⚡🔥💥☀️🌙☁️"),
  flags:   splitGraphemes("🇮🇱🇺🇸🇬🇧🇩🇪🇫🇷🇪🇸🇮🇹🇯🇵🇰🇷🇨🇳🇷🇺🇺🇦🇵🇱🇳🇱🇧🇪🇨🇦🇦🇺🇧🇷🇲🇽🇸🇪🇳🇴🇩🇰🇫🇮🇨🇭🇦🇹🇬🇷🇹🇷🇪🇬🇸🇦🇦🇪🇮🇳🇹🇭🇻🇳🇸🇬🇭🇰🇹🇼🇿🇦🇳🇿🇮🇪🇵🇹🇨🇿🇭🇺🇷🇴"),
};

// ===== Hieroglyph categories (your Gardiner list stays the same) =====
const HIERO_GARDINER_CATEGORIES = [
  { key: "A",  name: "Man and his occupations",                         start: 0x13000, end: 0x1304F },
  { key: "B",  name: "Woman and her occupations",                       start: 0x13050, end: 0x13059 },
  { key: "C",  name: "Anthropomorphic deities",                         start: 0x1305A, end: 0x13075 },
  { key: "D",  name: "Parts of the human body",                         start: 0x13076, end: 0x130D1 },
  { key: "E",  name: "Mammals",                                         start: 0x130D2, end: 0x130FD },
  { key: "F",  name: "Parts of mammals",                                start: 0x130FE, end: 0x1313E },
  { key: "G",  name: "Birds",                                           start: 0x1313F, end: 0x1317E },
  { key: "H",  name: "Parts of birds",                                  start: 0x1317F, end: 0x13187 },
  { key: "I",  name: "Amphibious animals, reptiles, etc.",              start: 0x13188, end: 0x1319A },
  { key: "K",  name: "Fish and parts of fish",                          start: 0x1319B, end: 0x131A2 },
  { key: "L",  name: "Invertebrates and lesser animals",                start: 0x131A3, end: 0x131AC },
  { key: "M",  name: "Trees and plants",                                start: 0x131AD, end: 0x131EE },
  { key: "N",  name: "Sky, earth, water",                               start: 0x131EF, end: 0x1324F },
  { key: "O",  name: "Buildings, parts of buildings, etc.",             start: 0x13250, end: 0x1329A },
  { key: "P",  name: "Ships and parts of ships",                        start: 0x1329B, end: 0x132A7 },
  { key: "Q",  name: "Domestic and funerary furniture",                 start: 0x132A8, end: 0x132AE },
  { key: "R",  name: "Temple furniture and sacred emblems",             start: 0x132AF, end: 0x132D0 },
  { key: "S",  name: "Crowns, dress, staves, etc.",                     start: 0x132D1, end: 0x13306 },
  { key: "T",  name: "Warfare, hunting, and butchery",                  start: 0x13307, end: 0x13332 },
  { key: "U",  name: "Agriculture, crafts, and professions",            start: 0x13333, end: 0x13361 },
  { key: "V",  name: "Rope, fiber, baskets, bags, etc.",                start: 0x13362, end: 0x133AE },
  { key: "W",  name: "Vessels of stone and earthenware",                start: 0x133AF, end: 0x133CE },
  { key: "X",  name: "Loaves and cakes",                                start: 0x133CF, end: 0x133DA },
  { key: "Y",  name: "Writings, games, music",                          start: 0x133DB, end: 0x133E3 },
  { key: "Z",  name: "Strokes (incl. hieratic/geometric figures)",      start: 0x133E4, end: 0x1340C },
  { key: "Aa", name: "Unclassified",                                    start: 0x1340D, end: 0x1342F },
];

function codepointsToChars(start, end) {
  const out = [];
  for (let cp = start; cp <= end; cp++) out.push(String.fromCodePoint(cp));
  return out;
}

// ===== ONLINE EMOJI DATA + SEARCH =====
const ONLINE_EMOJI_URL = 'https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/data.json';

// emojibase "group" -> our WhatsApp-like category keys
const GROUP_TO_KEY = new Map([
  [0, 'smileys'], // Smileys & Emotion
  [1, 'people'],  // People & Body
  [3, 'animals'], // Animals & Nature
  [4, 'food'],    // Food & Drink
  [5, 'travel'],  // Travel & Places
  [6, 'activity'],// Activities
  [7, 'objects'], // Objects
  [8, 'symbols'], // Symbols
  [9, 'flags'],   // Flags
]);

let emojiCatalog = { ...EMOJI_OFFLINE }; // start offline
let emojiMeta = null;                    // for online search
let emojiOnlineReady = false;

function uniq(arr) { return [...new Set(arr)]; }

async function tryEnableOnlineEmoji() {
  // Only works when served via http(s)
  if (!/^https?:$/.test(location.protocol)) {
    emojiOnlineReady = false;
    setCategoryHeader(catTitleEl?.textContent || 'Emoji', 'Online mode needs http(s) (not file://)');
    return;
  }
  if (!navigator.onLine) {
    emojiOnlineReady = false;
    return;
  }

  try {
    // show loading hint if user is on emoji tab
    if (pickerType === 'emoji') setCategoryHeader('Emoji', 'Loading online emoji data…');

    const res = await fetch(ONLINE_EMOJI_URL, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const cat = {
      smileys: [], people: [], animals: [], food: [], activity: [],
      travel: [], objects: [], symbols: [], flags: [],
    };
    const meta = [];

    for (const e of data) {
      if (!e || !e.emoji) continue;
      const key = GROUP_TO_KEY.get(e.group);
      if (!key) continue;

      cat[key].push(e.emoji);
      meta.push({
        emoji: e.emoji,
        label: (e.label || '').toLowerCase(),
        tags: Array.isArray(e.tags) ? e.tags.map(t => String(t).toLowerCase()) : [],
        key,
      });

      // include skin variations (optional but closer to real pickers)
      if (Array.isArray(e.skins)) {
        for (const s of e.skins) {
          if (!s || !s.emoji) continue;
          cat[key].push(s.emoji);
          meta.push({
            emoji: s.emoji,
            label: (e.label || '').toLowerCase(),
            tags: Array.isArray(e.tags) ? e.tags.map(t => String(t).toLowerCase()) : [],
            key,
          });
        }
      }
    }

    // de-dupe categories
    for (const k of Object.keys(cat)) cat[k] = uniq(cat[k]);

    emojiCatalog = cat;
    emojiMeta = meta;
    emojiOnlineReady = true;

    // refresh current view
    if (pickerType === 'emoji') {
      const k = (activeCatKey && activeCatKey !== 'recent') ? activeCatKey : 'smileys';
      pickerSearch.placeholder = 'Search emojis…';
      activateCategory(k);
    }
  } catch (err) {
    console.warn('Online emoji load failed:', err);
    emojiOnlineReady = false;
    // keep offline
    if (pickerType === 'emoji') {
      setCategoryHeader('Emoji', 'Online emoji load failed; using offline list');
      activateCategory('smileys');
    }
  }
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function searchEmoji(q) {
  if (!emojiOnlineReady || !emojiMeta) return [];
  q = q.trim().toLowerCase();
  if (!q) return [];

  const out = [];
  const seen = new Set();

  for (const e of emojiMeta) {
    if (!e || !e.emoji) continue;
    if (seen.has(e.emoji)) continue;

    const hit =
      (e.label && e.label.includes(q)) ||
      (e.tags && e.tags.some(t => t.includes(q)));

    if (hit) {
      out.push(e.emoji);
      seen.add(e.emoji);
      if (out.length >= 400) break; // keep UI fast
    }
  }
  return out;
}

// ===== Picker state =====
let pickerType = 'emoji'; // 'emoji' | 'hiero'
let activeCatKey = null;

function setActiveTab(type) {
  pickerType = type;
  tabEmoji.classList.toggle('active', type === 'emoji');
  tabHiero.classList.toggle('active', type === 'hiero');

  // enable search ONLY for emoji
  if (type === 'emoji') {
    pickerSearch.disabled = false;
    pickerSearch.placeholder = emojiOnlineReady ? 'Search emojis…' : 'Search (online loading…)';
  } else {
    pickerSearch.value = '';
    pickerSearch.disabled = true;
    pickerSearch.placeholder = 'Search (emoji only)';
  }
}

function buildCatsForEmoji() {
  pickerCats.innerHTML = '';
  for (const cat of EMOJI_CATS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'catBtn';
    btn.textContent = cat.icon;
    btn.title = cat.label;
    btn.dataset.key = cat.key;
    btn.addEventListener('click', () => activateCategory(cat.key));
    pickerCats.appendChild(btn);
  }
}

// hiero categories = icon/letter only
function buildCatsForHiero() {
  pickerCats.innerHTML = '';

  const recentBtn = document.createElement('button');
  recentBtn.type = 'button';
  recentBtn.className = 'catBtn';
  recentBtn.textContent = '🕘';
  recentBtn.title = 'Recent';
  recentBtn.dataset.key = 'recent';
  recentBtn.addEventListener('click', () => activateCategory('recent'));
  pickerCats.appendChild(recentBtn);

  for (const cat of HIERO_GARDINER_CATEGORIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'catBtn hieroIcon' + (cat.key === 'Aa' ? ' aa' : '');
    btn.textContent = cat.key;
    btn.title = `${cat.key}: ${cat.name}`;
    btn.dataset.key = cat.key;
    btn.addEventListener('click', () => activateCategory(cat.key));
    pickerCats.appendChild(btn);
  }
}

function markActiveCat(key) {
  activeCatKey = key;
  [...pickerCats.querySelectorAll('.catBtn')].forEach(b => {
    b.classList.toggle('active', b.dataset.key === key);
  });
}

function activateCategory(key) {
  markActiveCat(key);

  if (pickerType === 'emoji') {
    pickerSearch.value = ''; // switching category clears search
    pickerSearch.placeholder = emojiOnlineReady ? 'Search emojis…' : 'Search (online loading…)';

    if (key === 'recent') {
      setCategoryHeader('Recent', 'Last used');
      const rec = getRecentsFor('emoji');
      const fallback = (emojiCatalog.smileys || EMOJI_OFFLINE.smileys || []).slice(0, 60);
      renderSymbols(rec.length ? rec : fallback, { type: 'emoji' });
      return;
    }

    const catInfo = EMOJI_CATS.find(c => c.key === key);
    setCategoryHeader(catInfo ? catInfo.label : 'Emoji', emojiOnlineReady ? 'Online catalog' : 'Offline catalog');
    const list = emojiCatalog[key] || EMOJI_OFFLINE[key] || EMOJI_OFFLINE.smileys;
    renderSymbols(list, { type: 'emoji' });
    return;
  }

  // hieroglyphs
  if (key === 'recent') {
    setCategoryHeader('Recent', 'Last used');
    const rec = getRecentsFor('hiero');
    renderSymbols(rec.length ? rec : [String.fromCodePoint(0x13000)], { type: 'hiero' });
    return;
  }

  const cat = HIERO_GARDINER_CATEGORIES.find(c => c.key === key);
  if (!cat) return;

  setCategoryHeader(`${cat.key}: ${cat.name}`, `U+${cat.start.toString(16).toUpperCase()} – U+${cat.end.toString(16).toUpperCase()}`);
  renderSymbols(codepointsToChars(cat.start, cat.end), { type: 'hiero' });
}

// Search handler (emoji online search)
const onSearch = debounce(() => {
  if (pickerType !== 'emoji') return;

  const q = pickerSearch.value.trim();
  if (!q) {
    // restore current category
    const k = (activeCatKey && activeCatKey !== 'recent') ? activeCatKey : 'smileys';
    activateCategory(k);
    return;
  }

  if (!emojiOnlineReady) {
    setCategoryHeader('Search', 'Online emoji data not loaded yet (serve over http://)');
    renderSymbols([], { type: 'emoji' });
    return;
  }

  const hits = searchEmoji(q);
  setCategoryHeader('Search', `${hits.length} results for "${q}"`);
  renderSymbols(hits, { type: 'emoji' });
}, 120);

pickerSearch.addEventListener('input', onSearch);

// Tab events
tabEmoji.addEventListener('click', () => {
  setActiveTab('emoji');
  buildCatsForEmoji();
  activateCategory('smileys');
});

tabHiero.addEventListener('click', () => {
  setActiveTab('hiero');
  buildCatsForHiero();
  activateCategory('A');
});

// React to connectivity
window.addEventListener('online', () => { tryEnableOnlineEmoji(); });
window.addEventListener('offline', () => {
  emojiOnlineReady = false;
  if (pickerType === 'emoji') {
    setCategoryHeader('Emoji', 'Offline (using fallback list)');
    activateCategory('smileys');
  }
});

// ===== init =====
setActiveTab('emoji');
buildCatsForEmoji();
activateCategory('smileys');
tryEnableOnlineEmoji();
