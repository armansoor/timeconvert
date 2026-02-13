// script.js - World Clock + DST-aware converter + analog/digital + minute slider
// No external libraries. All modern-browser Intl based.

const tzPicker = document.getElementById('tz-picker');
const tzSearch = document.getElementById('tz-search');
const addTzBtn = document.getElementById('add-tz');
const addLocalBtn = document.getElementById('add-local');
const clocksContainer = document.getElementById('clocks');

const fromTz = document.getElementById('from-tz');
const toTz = document.getElementById('to-tz');
const fromDate = document.getElementById('from-date');
const fromTime = document.getElementById('from-time');
const convertBtn = document.getElementById('convert');
const swapBtn = document.getElementById('swap');
const nowBtn = document.getElementById('now');
const resultOutput = document.getElementById('result');
const calExportDiv = document.getElementById('calendar-export');
const btnGoogle = document.getElementById('btn-google');
const btnIcs = document.getElementById('btn-ics');

const globalToggle = document.getElementById('global-style-toggle');
const formatToggle = document.getElementById('format-toggle');
const themeToggle = document.getElementById('theme-toggle');
const localClockEl = document.getElementById('local-clock');

const slider = document.getElementById('time-slider');
const sliderFromDisplay = document.getElementById('slider-from-display');
const sliderToDisplay = document.getElementById('slider-to-display');
const sliderNowBtn = document.getElementById('slider-now');
const sliderSyncBtn = document.getElementById('slider-sync');

let watchedZones = [];
const allTimeZones = getAllTimeZones();
let perClockStyle = {}; // { tzId: 'analog'|'digital' }
let customLabels = {}; // { tzId: 'My Label' }
let is12h = false;
let isLight = false;
const STORAGE_KEY = 'watchedZones_v2';
const STYLE_KEY = 'clockStyles_v2';
const GLOBAL_STYLE_KEY = 'globalStyle_v2';
const FORMAT_KEY = 'is12h_v1';
const THEME_KEY = 'theme_v1';
const LABELS_KEY = 'customLabels_v1';

const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  target: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>',
  clock: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
  digit: '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
  sun: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
};

// --- timezone utilities (same robust approach) ---
function getAllTimeZones() {
  if (typeof Intl === 'object' && typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone').sort();
    } catch (e) {}
  }
  return [
    "UTC","Europe/London","Europe/Paris","Europe/Berlin","Europe/Moscow",
    "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
    "America/Phoenix","America/Anchorage","America/Sao_Paulo","America/Argentina/Buenos_Aires",
    "Asia/Tokyo","Asia/Shanghai","Asia/Hong_Kong","Asia/Singapore",
    "Asia/Kolkata","Asia/Dubai","Asia/Seoul","Asia/Taipei","Asia/Bangkok",
    "Australia/Sydney","Pacific/Auckland","Africa/Johannesburg"
  ].sort();
}

function formatForTimeZone(date, timeZone, opts = {}) {
  const df = new Intl.DateTimeFormat(undefined, Object.assign({
    timeZone,
    hour12: is12h,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }, opts));
  return df.format(date);
}

function getPartsForZone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit'
  });
  const parts = fmt.formatToParts(date).reduce((acc,p)=>{ if(p.type!=='literal') acc[p.type]=p.value; return acc; }, {});
  return parts; // year, month, day, hour, minute, second
}

function getOffsetMinutes(date, timeZone) {
  const parts = getPartsForZone(date, timeZone);
  const constructed = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((constructed - date.getTime()) / 60000);
}

// Convert wall-time in source TZ -> UTC instant -> return Date and formatted string in target TZ
function convertWallTimeToTarget(year, month, day, hour, minute, sourceTZ, targetTZ) {
  const asIfUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMinutes = getOffsetMinutes(asIfUTC, sourceTZ);
  const trueUtcMs = asIfUTC.getTime() - offsetMinutes * 60 * 1000;
  const trueDate = new Date(trueUtcMs);
  const df = new Intl.DateTimeFormat(undefined, {
    timeZone: targetTZ, hour12: false, year:'numeric', month:'long', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'
  });
  return { date: trueDate, formatted: df.format(trueDate) };
}

// Given a true Date instant and timezone, return local parts object
function localParts(date, tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hour12: false, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'
  });
  return fmt.formatToParts(date).reduce((acc,p)=>{ if(p.type!=='literal') acc[p.type]=p.value; return acc; }, {});
}

// --- UI populate ---
function populateSelect(selectEl, selected) {
  selectEl.innerHTML = '';
  allTimeZones.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz; opt.textContent = tz;
    if (selected && selected === tz) opt.selected = true;
    selectEl.appendChild(opt);
  });
}
function populateSearchablePicker() {
  tzPicker.innerHTML = '';
  allTimeZones.forEach(tz => {
    const opt = document.createElement('option');
    opt.value = tz; opt.textContent = tz;
    tzPicker.appendChild(opt);
  });
}

// --- initialization & persistence ---
function loadState() {
  // Check hash first for shared URLs
  if (window.location.hash.length > 1) {
    try {
      const zones = window.location.hash.slice(1).split(',');
      // Validate zones to prevent XSS or errors
      const valid = zones.filter(z => allTimeZones.includes(z));
      if (valid.length > 0) watchedZones = valid;
    } catch (e) { console.error('Error parsing hash', e); }
  } else {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) watchedZones = JSON.parse(stored);
    } catch(e){ watchedZones = []; }
  }

  try {
    const s = localStorage.getItem(STYLE_KEY);
    if (s) perClockStyle = JSON.parse(s);
  } catch(e){ perClockStyle = {}; }

  try {
    const l = localStorage.getItem(LABELS_KEY);
    if (l) customLabels = JSON.parse(l);
  } catch(e){ customLabels = {}; }

  const g = localStorage.getItem(GLOBAL_STYLE_KEY);
  if (g) globalToggle.checked = g === 'analog';

  const f = localStorage.getItem(FORMAT_KEY);
  if (f) {
    is12h = (f === 'true');
    formatToggle.checked = is12h;
  }

  const t = localStorage.getItem(THEME_KEY);
  if (t === 'light') isLight = true;
  applyTheme();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(watchedZones));
  localStorage.setItem(STYLE_KEY, JSON.stringify(perClockStyle));
  localStorage.setItem(LABELS_KEY, JSON.stringify(customLabels));
  localStorage.setItem(GLOBAL_STYLE_KEY, globalToggle.checked ? 'analog' : 'digital');
  localStorage.setItem(FORMAT_KEY, is12h);
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');

  // Update URL hash
  if (watchedZones.length > 0) {
    history.replaceState(null, null, '#' + watchedZones.join(','));
  } else {
    history.replaceState(null, null, ' ');
  }
}

function applyTheme() {
  if (isLight) {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.innerHTML = ICONS.moon;
    themeToggle.title = 'Switch to Dark Mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.innerHTML = ICONS.sun;
    themeToggle.title = 'Switch to Light Mode';
  }
}

function init() {
  populateSelect(fromTz, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  populateSelect(toTz, 'UTC');
  populateSearchablePicker();

  // default date/time to now (local)
  const now = new Date();
  fromDate.value = now.toISOString().slice(0,10);
  fromTime.value = now.toTimeString().slice(0,5);

  loadState();

  if (!watchedZones || watchedZones.length === 0) {
    watchedZones = ['UTC','America/New_York','Europe/London','Asia/Seoul'];
  }
  renderClocks();
  updateLocalClock();
  setInterval(updateLocalClock, 1000);
}

// --- Drag and Drop ---
let dragSrcTz = null;

function handleDragStart(e) {
  dragSrcTz = this.dataset.tz;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragSrcTz);
  this.classList.add('dragging');
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation();
  this.classList.remove('drag-over');

  const srcTz = dragSrcTz;
  const targetTz = this.dataset.tz;

  if (srcTz && srcTz !== targetTz) {
    const srcIdx = watchedZones.indexOf(srcTz);
    if (srcIdx > -1) {
      watchedZones.splice(srcIdx, 1);
      // Find new index of target after removal
      const newTgtIdx = watchedZones.indexOf(targetTz);
      if (newTgtIdx > -1) {
        watchedZones.splice(newTgtIdx, 0, srcTz);
        saveState();
        renderClocks();
      }
    }
  }
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.clock-card').forEach(c => c.classList.remove('drag-over'));
}

// --- clocks rendering and update ---
function renderClocks() {
  clocksContainer.innerHTML = '';
  watchedZones.forEach(tz => {
    const card = document.createElement('article');
    card.className = 'clock-card';
    card.dataset.tz = tz;

    const top = document.createElement('div'); top.className = 'card-top';

    const titleRow = document.createElement('div'); titleRow.className = 'card-title-row';
    const indicator = document.createElement('div'); indicator.className = 'business-indicator';
    indicator.title = 'Business Hours (Mon-Fri 9am-5pm)';
    const title = document.createElement('div'); title.className = 'card-title';
    title.textContent = customLabels[tz] || tz;
    title.title = 'Click to rename';
    title.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent drag start if any
      const newName = prompt('Rename this clock (leave empty to reset):', customLabels[tz] || tz);
      if (newName !== null) {
        if (newName.trim() === '' || newName.trim() === tz) {
          delete customLabels[tz];
        } else {
          customLabels[tz] = newName.trim();
        }
        saveState();
        renderClocks();
      }
    });

    titleRow.appendChild(indicator);
    titleRow.appendChild(title);

    const actions = document.createElement('div'); actions.className = 'card-actions';

    // Drag and drop attributes
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    const styleBtn = document.createElement('button');
    const isAnalog = perClockStyle[tz] === 'analog';
    styleBtn.innerHTML = isAnalog ? ICONS.digit : ICONS.clock;
    styleBtn.title = isAnalog ? 'Switch to Digital' : 'Switch to Analog';
    styleBtn.addEventListener('click', () => {
      perClockStyle[tz] = perClockStyle[tz] === 'analog' ? 'digital' : 'analog';
      saveState();
      renderClocks();
    });

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = ICONS.trash;
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => {
      watchedZones = watchedZones.filter(z => z !== tz);
      saveState();
      renderClocks();
    });

    const setFromBtn = document.createElement('button');
    setFromBtn.innerHTML = ICONS.target;
    setFromBtn.title = 'Use as From Zone';
    setFromBtn.addEventListener('click', () => {
      fromTz.value = tz;
      fromTz.dispatchEvent(new Event('change'));
    });

    actions.appendChild(setFromBtn);
    actions.appendChild(styleBtn);
    actions.appendChild(removeBtn);

    top.appendChild(titleRow);
    top.appendChild(actions);

    const center = document.createElement('div'); center.className = 'card-center';
    const timeEl = document.createElement('div'); timeEl.className = 'time-large';
    timeEl.setAttribute('aria-live','polite');
    const sub = document.createElement('div'); sub.className = 'tz-name';
    const diffEl = document.createElement('div'); diffEl.className = 'time-diff'; // difference display

    // analog canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'clock-canvas';
    canvas.width = 180; canvas.height = 180; // high-dpi drawing scaled via CSS
    canvas.style.width = '80px'; canvas.style.height = '80px';

    center.appendChild(canvas);
    center.appendChild(timeEl);
    center.appendChild(sub);
    center.appendChild(diffEl);

    card.appendChild(top);
    card.appendChild(center);

    clocksContainer.appendChild(card);
  });
  updateClockTimes();
}

// update clock times (digital text and draw analog if selected)
function updateClockTimes() {
  const now = new Date();
  const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const localOffset = getOffsetMinutes(now, localTZ);

  document.querySelectorAll('.clock-card').forEach(card => {
    const tz = card.dataset.tz;
    const timeEl = card.querySelector('.time-large');
    const sub = card.querySelector('.tz-name');
    const diffEl = card.querySelector('.time-diff');
    const canvas = card.querySelector('canvas');

    const dfTime = new Intl.DateTimeFormat(undefined, { timeZone: tz, hour12: is12h, hour:'2-digit', minute:'2-digit', second:'2-digit' });
    const dfDate = new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday:'short', year:'numeric', month:'short', day:'2-digit' });
    timeEl.textContent = dfTime.format(now);
    sub.textContent = dfDate.format(now);

    // Business Hours Logic (Mon-Fri, 09:00 - 17:00)
    const busFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, weekday: 'short', hour: 'numeric' });
    const busParts = busFmt.formatToParts(now);
    const busDay = busParts.find(p => p.type === 'weekday').value;
    const busHour = parseInt(busParts.find(p => p.type === 'hour').value, 10);
    const isWeekend = (busDay === 'Sat' || busDay === 'Sun');
    // hour 17 means 5pm. Typically 9-5 means up to 17:00 exclusive.
    if (!isWeekend && busHour >= 9 && busHour < 17) {
      card.classList.add('business-active');
    } else {
      card.classList.remove('business-active');
    }

    // Time diff
    const targetOffset = getOffsetMinutes(now, tz);
    const diff = targetOffset - localOffset;
    const diffH = Math.floor(diff / 60);
    const diffM = Math.abs(diff % 60);
    let diffStr = '';
    if (diff === 0) diffStr = 'Same time';
    else {
      const sign = diff > 0 ? '+' : '-';
      diffStr = `${sign}${Math.abs(diffH)}h${diffM > 0 ? diffM + 'm' : ''}`;
    }
    if (diffEl) diffEl.textContent = diffStr;

    const style = globalToggle.checked ? 'analog' : (perClockStyle[tz] || 'digital');

    if (style === 'analog' && canvas) {
      drawAnalogClock(canvas, now, tz);
      canvas.style.display = '';
      timeEl.style.display = 'none';
    } else {
      if (canvas) canvas.style.display = 'none';
      timeEl.style.display = '';
    }
  });
}

// draw analog clock on canvas for a given instant and tz
function drawAnalogClock(canvas, instant, tz) {
  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  const size = canvas.clientWidth; // Use clientWidth for stable size
  const r = size / 2;

  // Set actual canvas drawing surface size based on DPR
  if (canvas.width !== size * DPR) {
    canvas.width = size * DPR;
    canvas.height = size * DPR;
  }

  // Scale context for high-DPI rendering
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0,0,size,size);
  ctx.translate(r, r);

  // get local time parts in tz
  const p = localParts(instant, tz);
  const hr = Number(p.hour) % 12;
  const min = Number(p.minute);
  const sec = Number(p.second);

  // Get colors from CSS
  const style = getComputedStyle(document.body);
  const colorText = style.getPropertyValue('--text').trim();
  const colorAccent = style.getPropertyValue('--accent').trim();
  const colorMuted = style.getPropertyValue('--muted').trim();
  const colorGlass = style.getPropertyValue('--glass').trim();

  // face
  ctx.beginPath();
  ctx.fillStyle = colorGlass;
  ctx.arc(0,0,r-2,0,Math.PI*2);
  ctx.fill();

  // ticks
  for (let i=0;i<60;i++){
    const ang = (i/60)*Math.PI*2;
    const len = (i%5===0) ? r*0.12 : r*0.06;
    ctx.beginPath();
    ctx.strokeStyle = i%5===0 ? colorText : colorMuted;
    ctx.globalAlpha = i%5===0 ? 0.8 : 0.4;
    ctx.lineWidth = (i%5===0)?2:1;
    ctx.moveTo(Math.cos(ang)*(r-8), Math.sin(ang)*(r-8));
    ctx.lineTo(Math.cos(ang)*(r-8-len), Math.sin(ang)*(r-8-len));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // hour hand
  const hourAng = ((hr + min/60) / 12) * Math.PI*2 - Math.PI/2;
  ctx.beginPath(); ctx.lineCap='round';
  ctx.strokeStyle = colorText; ctx.lineWidth = r*0.08;
  ctx.moveTo(0,0); ctx.lineTo(Math.cos(hourAng)*(r*0.5), Math.sin(hourAng)*(r*0.5)); ctx.stroke();

  // minute hand
  const minAng = ((min + sec/60)/60)*Math.PI*2 - Math.PI/2;
  ctx.beginPath(); ctx.lineWidth = r*0.06;
  ctx.strokeStyle = colorText;
  ctx.moveTo(0,0); ctx.lineTo(Math.cos(minAng)*(r*0.74), Math.sin(minAng)*(r*0.74)); ctx.stroke();

  // second hand
  const secAng = (sec/60)*Math.PI*2 - Math.PI/2;
  ctx.beginPath(); ctx.lineWidth = 2;
  ctx.strokeStyle = colorAccent;
  ctx.moveTo(Math.cos(secAng)*-r*0.15, Math.sin(secAng)*-r*0.15);
  ctx.lineTo(Math.cos(secAng)*(r*0.82), Math.sin(secAng)*(r*0.82));
  ctx.stroke();

  // center dot
  ctx.beginPath();
  ctx.fillStyle = colorText;
  ctx.arc(0,0, r*0.04,0,Math.PI*2); ctx.fill();

  // reset transform
  ctx.setTransform(1,0,0,1,0,0);
}

// local clock
function updateLocalClock() {
  const now = new Date();
  const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  localClockEl.textContent = formatForTimeZone(now, localTZ, {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

// --- Converter events ---
let lastConversionResult = null;

convertBtn.addEventListener('click', () => {
  try {
    const src = fromTz.value;
    const tgt = toTz.value;
    if (!src || !tgt) { resultOutput.textContent = 'Pick both timezones.'; return; }
    if (!fromDate.value || !fromTime.value) { resultOutput.textContent = 'Pick a date and time.'; return; }
    const [y,m,d] = fromDate.value.split('-').map(Number);
    const [hh,mm] = fromTime.value.split(':').map(Number);
    const conv = convertWallTimeToTarget(y,m,d,hh,mm,src,tgt);
    // display target local parts (date may differ)
    const parts = localParts(conv.date, tgt);
    resultOutput.textContent = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} (${tgt})`;

    // Store result for calendar export
    lastConversionResult = { date: conv.date, targetTz: tgt, sourceTz: src };
    calExportDiv.style.display = 'flex';
  } catch (err) {
    console.error(err);
    resultOutput.textContent = 'Conversion failed — see console.';
    calExportDiv.style.display = 'none';
  }
});

btnGoogle.addEventListener('click', (e) => {
  e.preventDefault();
  if (!lastConversionResult) return;
  const { date, targetTz, sourceTz } = lastConversionResult;
  // Google Calendar uses UTC "Z" format
  const start = date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const end = new Date(date.getTime() + 60*60*1000).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const text = `Meeting (${targetTz})`;
  const details = `Time converted from ${sourceTz} to ${targetTz}`;
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(targetTz)}`;
  window.open(url, '_blank');
});

btnIcs.addEventListener('click', (e) => {
  e.preventDefault();
  if (!lastConversionResult) return;
  const { date, targetTz, sourceTz } = lastConversionResult;
  const start = date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const end = new Date(date.getTime() + 60*60*1000).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WorldClock//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@worldclock`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Meeting (${targetTz})`,
    `DESCRIPTION:Time converted from ${sourceTz} to ${targetTz}`,
    `LOCATION:${targetTz}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'event.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

swapBtn.addEventListener('click', (e) => { e.preventDefault(); const a = fromTz.value; fromTz.value = toTz.value; toTz.value = a; });

nowBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const now = new Date();
  const src = fromTz.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const parts = getPartsForZone(now, src);
  fromDate.value = `${parts.year}-${parts.month}-${parts.day}`;
  fromTime.value = `${parts.hour}:${parts.minute}`;
  convertBtn.click();
});

// add timezone buttons & search
addTzBtn.addEventListener('click', () => {
  const tz = tzPicker.value;
  if (!tz) return;
  if (!watchedZones.includes(tz)) {
    watchedZones.push(tz);
    saveState();
    renderClocks();
  }
});
addLocalBtn.addEventListener('click', () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  if (!watchedZones.includes(tz)) { watchedZones.push(tz); saveState(); renderClocks(); }
});

tzSearch.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  tzPicker.innerHTML = '';
  const filtered = allTimeZones.filter(tz => tz.toLowerCase().includes(q));
  (filtered.length ? filtered : allTimeZones).forEach(tz => {
    const opt = document.createElement('option'); opt.value = tz; opt.textContent = tz; tzPicker.appendChild(opt);
  });
});

// slider logic: slider value is minutes from 0..1439 representing wall-time in From timezone on selected date
function syncSliderFromInputs() {
  // parse from-date and from-time and set slider
  if (!fromDate.value || !fromTime.value) return;
  const [y,m,d] = fromDate.value.split('-').map(Number);
  const [hh,mm] = fromTime.value.split(':').map(Number);
  const minutes = hh * 60 + mm;
  slider.value = minutes;
  updateSliderDisplays();
}

function updateSliderDisplays() {
  const minutes = Number(slider.value);
  // source date components
  const [y,m,d] = fromDate.value.split('-').map(Number);
  const srcHour = Math.floor(minutes/60);
  const srcMin = minutes % 60;
  // convert
  const conv = convertWallTimeToTarget(y,m,d,srcHour,srcMin, fromTz.value, toTz.value);
  // get local parts for target to display day relation
  const srcParts = {year:y,month: String(m).padStart(2,'0'),day: String(d).padStart(2,'0'),hour: String(srcHour).padStart(2,'0'),minute: String(srcMin).padStart(2,'0')};
  const tgtParts = localParts(conv.date, toTz.value);
  const srcDisplay = `${srcParts.year}-${srcParts.month}-${srcParts.day} ${srcParts.hour}:${srcParts.minute} (${fromTz.value})`;
  const tgtDisplay = `${tgtParts.year}-${tgtParts.month}-${tgtParts.day} ${tgtParts.hour}:${tgtParts.minute} (${toTz.value})`;
  // compute day difference
  const srcYMD = `${srcParts.year}-${srcParts.month}-${srcParts.day}`;
  const tgtYMD = `${tgtParts.year}-${tgtParts.month}-${tgtParts.day}`;
  let suffix = '';
  if (tgtYMD !== srcYMD) {
    // find relative day
    const s = new Date(Date.UTC(Number(srcParts.year), Number(srcParts.month)-1, Number(srcParts.day)));
    const t = new Date(Date.UTC(Number(tgtParts.year), Number(tgtParts.month)-1, Number(tgtParts.day)));
    const diffDays = Math.round((t - s) / (24*60*60*1000));
    if (diffDays === -1) suffix = ' (previous day)';
    else if (diffDays === 1) suffix = ' (next day)';
    else suffix = ` (${diffDays>0?diffDays+' days later':Math.abs(diffDays)+' days earlier'})`;
  }
  sliderFromDisplay.textContent = srcDisplay;
  sliderToDisplay.textContent = tgtDisplay + suffix;
}

// allow slider to represent minutes and update displays as it moves
slider.addEventListener('input', updateSliderDisplays);

// slider control buttons
sliderNowBtn.addEventListener('click', (e)=> {
  e.preventDefault();
  // set slider to now in the FROM timezone (for selected date)
  const now = new Date();
  const src = fromTz.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const parts = getPartsForZone(now, src);
  // set date and slider
  fromDate.value = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour)*60 + Number(parts.minute);
  slider.value = minutes;
  updateSliderDisplays();
});
sliderSyncBtn.addEventListener('click', (e) => { e.preventDefault(); syncSliderFromInputs(); });

// populate selects and initialize
populateSelect(fromTz);
populateSelect(toTz);
populateSearchablePicker();
init();

// live update loop (1s)
setInterval(()=>{
  updateClockTimes();
  updateSliderDisplays();
}, 1000);

// global style toggle
globalToggle.addEventListener('change', () => {
  saveState();
  renderClocks();
});

formatToggle.addEventListener('change', () => {
  is12h = formatToggle.checked;
  saveState();
  updateClockTimes();
  updateLocalClock();
});

themeToggle.addEventListener('click', () => {
  isLight = !isLight;
  applyTheme();
  saveState();
  renderClocks();
});

// make sure saved styles are applied after render
(function restoreStyles(){
  try {
    const s = localStorage.getItem(STYLE_KEY);
    if (s) perClockStyle = JSON.parse(s);
  } catch(e){}
})();

// expose small helpers for debugging
window.worldClock = {
  allTimeZones, watchedZones, convertWallTimeToTarget
};
