import { CATEGORIES, UNKNOWN_COLOR, categoryColor, categoryLabel, formatDate } from './main.js';
import { openModal } from './modal.js';

const CATS = Object.keys(CATEGORIES);
const MIN_RADIUS = 20;
const MAX_RADIUS = 50;
const CENTER_RADIUS = 28;
const ANIM_DURATION = 800; // ms

let _events = [];
let _selectedCat = null;
let _hoveredCat = null;
let _animProgress = 0; // 0..1
let _animStart = null;
let _rafId = null;
let _nodePositions = []; // { cat, x, y, r }

export function renderSkillTree(events) {
  _events = events;
  _selectedCat = null;
  renderDesktop();
  renderMobileAccordion();
}

// ── Desktop Canvas ───────────────────────────────────────────────
function renderDesktop() {
  const canvas = document.getElementById('skill-canvas');
  const container = canvas.parentElement;

  // Responsive canvas size
  const size = Math.min(container.clientWidth, 560);
  canvas.width = size;
  canvas.height = size * 0.7;

  cancelAnimationFrame(_rafId);
  _animProgress = 0;
  _animStart = null;

  // Compute node positions (radial)
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const orbitR = Math.min(cx, cy) * 0.65;

  const counts = countByCategory(_events);
  const maxCount = Math.max(...Object.values(counts), 1);

  _nodePositions = CATS.map((cat, i) => {
    const angle = (i / CATS.length) * Math.PI * 2 - Math.PI / 2;
    const count = counts[cat] ?? 0;
    const r = MIN_RADIUS + ((count / maxCount) * (MAX_RADIUS - MIN_RADIUS));
    return { cat, x: cx + orbitR * Math.cos(angle), y: cy + orbitR * Math.sin(angle), r, count };
  });

  // Click handler
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const hit = _nodePositions.find(n => dist(mx, my, n.x, n.y) <= n.r + 6);
    if (hit) {
      _selectedCat = hit.cat === _selectedCat ? null : hit.cat;
      renderEventList(_selectedCat);
      drawFrame(canvas, 1); // redraw without re-animating
    }
  };

  // Canvas hover cursor + pulse repaint
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const hit = _nodePositions.find(n => dist(mx, my, n.x, n.y) <= n.r + 6);
    canvas.style.cursor = hit ? 'pointer' : 'default';
    const newHovered = hit?.cat ?? null;
    if (newHovered !== _hoveredCat) {
      _hoveredCat = newHovered;
      drawFrame(canvas, 1); // repaint with hover state
    }
  };

  // Animate
  function animate(ts) {
    if (!_animStart) _animStart = ts;
    _animProgress = Math.min((ts - _animStart) / ANIM_DURATION, 1);
    drawFrame(canvas, easeOut(_animProgress));
    if (_animProgress < 1) _rafId = requestAnimationFrame(animate);
  }
  _rafId = requestAnimationFrame(animate);
}

function drawFrame(canvas, progress) {
  const ctx = canvas.getContext('2d');
  const isDark = document.documentElement.dataset.theme === 'dark';
  const bgColor = isDark ? '#0f0f0f' : '#ffffff';
  const lineColor = isDark ? '#2a2a2a' : '#e0e0e0';
  const textColor = isDark ? '#f0f0f0' : '#1a1a1a';
  const centerColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const centerBorder = isDark ? '#444' : '#ccc';

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Lines from center to nodes
  _nodePositions.forEach(n => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (n.x - cx) * progress, cy + (n.y - cy) * progress);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Center node
  ctx.beginPath();
  ctx.arc(cx, cy, CENTER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = centerColor;
  ctx.fill();
  ctx.strokeStyle = centerBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Жизнь', cx, cy);

  // Category nodes
  _nodePositions.forEach(n => {
    const nx = cx + (n.x - cx) * progress;
    const ny = cy + (n.y - cy) * progress;
    const isSelected = n.cat === _selectedCat;

    ctx.beginPath();
    ctx.arc(nx, ny, n.r * progress, 0, Math.PI * 2);
    ctx.fillStyle = categoryColor(n.cat);
    ctx.globalAlpha = isSelected ? 1 : 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (isSelected) {
      ctx.strokeStyle = textColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (n.cat === _hoveredCat) {
      // Pulse ring on hover
      ctx.beginPath();
      ctx.arc(nx, ny, n.r * progress + 8, 0, Math.PI * 2);
      ctx.strokeStyle = categoryColor(n.cat);
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (progress > 0.6) {
      const label = categoryLabel(n.cat);
      const countLabel = `${n.count}`;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, n.r * 0.35)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.length > 7 ? label.slice(0, 6) + '…' : label, nx, ny - 5);
      ctx.font = `${Math.max(8, n.r * 0.28)}px system-ui`;
      ctx.fillText(countLabel, nx, ny + n.r * 0.38);
    }
  });
}

// ── Mobile Accordion ─────────────────────────────────────────────
function renderMobileAccordion() {
  const container = document.getElementById('skill-accordion');
  container.innerHTML = '';
  const counts = countByCategory(_events);

  CATS.forEach(cat => {
    const count = counts[cat] ?? 0;
    const events = _events.filter(e => e.category === cat);
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `
      <button class="accordion-header" style="border-left: 4px solid ${categoryColor(cat)}">
        <span>${categoryLabel(cat)}</span>
        <span style="display:flex;align-items:center;gap:8px">
          <span class="count">${count} событий</span>
          <span class="chevron">▾</span>
        </span>
      </button>
      <div class="accordion-body"></div>
    `;
    const body = item.querySelector('.accordion-body');
    const header = item.querySelector('.accordion-header');

    if (events.length === 0) {
      body.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:4px 0">Нет событий</div>';
    } else {
      events.forEach(ev => {
        const el = document.createElement('div');
        el.className = 'skill-event-item';
        el.innerHTML = `
          <div class="item-title">${escHtml(ev.title ?? '')}</div>
          <div class="item-date">${ev.date ? formatDate(ev.date) : '—'}</div>
        `;
        el.addEventListener('click', () => openModal(ev));
        body.appendChild(el);
      });
    }

    header.addEventListener('click', () => item.classList.toggle('open'));
    container.appendChild(item);
  });
}

// ── Event list (desktop, below canvas) ───────────────────────────
function renderEventList(cat) {
  const container = document.getElementById('skill-events');
  container.innerHTML = '';
  if (!cat) return;

  const events = _events.filter(e => e.category === cat);
  container.innerHTML = `<h3 style="color:${categoryColor(cat)}">${categoryLabel(cat)}</h3>`;
  if (events.length === 0) {
    container.innerHTML += '<div class="empty-state" style="padding:20px 0">Нет событий</div>';
    return;
  }
  events.forEach(ev => {
    const el = document.createElement('div');
    el.className = 'skill-event-item';
    el.innerHTML = `
      <div class="item-title">${escHtml(ev.title ?? '')}</div>
      <div class="item-date">${ev.date ? formatDate(ev.date) : '—'}</div>
    `;
    el.addEventListener('click', () => openModal(ev));
    container.appendChild(el);
  });
}

// ── Helpers ──────────────────────────────────────────────────────
function countByCategory(events) {
  return events.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {});
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Redraw canvas on theme change (so colors update)
const themeObserver = new MutationObserver(() => {
  if (document.getElementById('skill-tree-view').classList.contains('hidden')) return;
  drawFrame(document.getElementById('skill-canvas'), 1);
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
