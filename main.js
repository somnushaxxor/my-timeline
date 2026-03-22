import { renderTimeline, setTimelineEvents } from './timeline.js';
import { renderSkillTree } from './skill-tree.js';
import { openModal } from './modal.js';

// ── Category config ──────────────────────────────────────────────
export const CATEGORIES = {
  WORK:     { label: 'Работа',         color: '#3b82f6' },
  PROJECT:  { label: 'Проект',         color: '#8b5cf6' },
  TRAVEL:   { label: 'Путешествие',    color: '#22c55e' },
  PERSONAL: { label: 'Личное',         color: '#f97316' },
  LEARNING: { label: 'Самообразование',color: '#eab308' },
};
export const UNKNOWN_COLOR = '#9ca3af';

export function categoryColor(cat) {
  return CATEGORIES[cat]?.color ?? UNKNOWN_COLOR;
}

export function categoryLabel(cat) {
  return CATEGORIES[cat]?.label ?? cat;
}

export function formatDate(isoString) {
  const [y, m, d] = isoString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── Theme ────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('timeline_theme') ?? 'light';
  applyTheme(saved);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('timeline_theme', next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ── View switching ───────────────────────────────────────────────
let currentView = 'timeline';
let allEvents = [];

function initViewSwitcher() {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === currentView) return;
      currentView = view;
      document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b === btn));
      const timelineEl = document.getElementById('timeline-view');
      const skillEl = document.getElementById('skill-tree-view');
      if (view === 'timeline') {
        skillEl.classList.add('hidden');
        timelineEl.classList.remove('hidden');
        // Reset filter when switching
        setTimelineEvents(allEvents);
        renderTimeline(allEvents);
      } else {
        timelineEl.classList.add('hidden');
        skillEl.classList.remove('hidden');
        renderSkillTree(allEvents);
      }
    });
  });
}

// ── Data loading ─────────────────────────────────────────────────
async function loadEvents() {
  try {
    const res = await fetch('events.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const events = (data.events ?? []).map(e => ({
      ...e,
      summary: e.summary ?? (e.description ?? '').slice(0, 120),
    }));
    // Sort newest first
    events.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
    return events;
  } catch (err) {
    document.querySelector('main').innerHTML =
      `<div class="empty-state">Не удалось загрузить события: ${err.message}</div>`;
    return null;
  }
}

// ── Bootstrap ────────────────────────────────────────────────────
async function init() {
  initTheme();
  initViewSwitcher();

  const events = await loadEvents();
  if (!events) return;
  allEvents = events;

  setTimelineEvents(events);
  renderTimeline(events);
}

init();
export { openModal };
