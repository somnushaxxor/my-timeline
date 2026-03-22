import { formatDate, categoryLabel, CATEGORIES } from './main.js';
import { openModal } from './modal.js';

let _events = [];
let _activeFilter = 'ALL';

export function setTimelineEvents(events) {
  _events = events;
  _activeFilter = 'ALL';
}

export function renderTimeline(events) {
  _events = events;
  _activeFilter = 'ALL';
  renderFilterBar();
  renderCards(_events);
}

function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  // Replace buttons with fresh clones to avoid duplicate listeners on re-render
  bar.querySelectorAll('.filter-btn').forEach(btn => {
    const clone = btn.cloneNode(true);
    clone.classList.toggle('active', clone.dataset.cat === _activeFilter);
    clone.addEventListener('click', () => {
      _activeFilter = clone.dataset.cat;
      bar.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b === clone));
      const filtered = _activeFilter === 'ALL'
        ? _events
        : _events.filter(e => e.category === _activeFilter);
      renderCards(filtered);
    });
    btn.replaceWith(clone);
  });
}

function renderCards(events) {
  const container = document.getElementById('timeline');
  container.innerHTML = '';

  if (events.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет событий</div>';
    return;
  }

  events.forEach(event => {
    const card = document.createElement('div');
    card.className = 'event-card';
    const cat = event.category ?? 'unknown';
    const badgeClass = Object.keys(CATEGORIES).includes(cat) ? `badge-${cat}` : 'badge-unknown';
    card.innerHTML = `
      <div class="card-date">${event.date ? formatDate(event.date) : '—'}</div>
      <div class="card-title">${escHtml(event.title ?? '')}</div>
      <div class="card-summary">${escHtml(truncate(event.summary ?? '', 120))}</div>
      <span class="badge ${badgeClass}">${categoryLabel(cat)}</span>
    `;
    card.addEventListener('click', () => openModal(event));
    container.appendChild(card);
  });

  // Intersection Observer for slide-up animation
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  container.querySelectorAll('.event-card').forEach(card => observer.observe(card));
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
