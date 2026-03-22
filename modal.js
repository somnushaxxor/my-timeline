import { formatDate, categoryLabel, CATEGORIES } from './main.js';

const overlay = document.getElementById('modal-overlay');
const modalEl = document.getElementById('modal');

export function openModal(event) {
  const cat = event.category ?? 'unknown';
  const badgeClass = Object.keys(CATEGORIES).includes(cat) ? `badge-${cat}` : 'badge-unknown';

  document.getElementById('modal-title').textContent = event.title ?? '';
  document.getElementById('modal-date').textContent = event.date ? formatDate(event.date) : '—';
  document.getElementById('modal-body').textContent = event.description ?? event.summary ?? '';

  const badge = document.getElementById('modal-badge');
  badge.textContent = categoryLabel(cat);
  badge.className = `badge ${badgeClass}`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus the close button for accessibility
  document.getElementById('modal-close').focus();
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Close button
document.getElementById('modal-close').addEventListener('click', closeModal);

// Click outside
overlay.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

// Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
});
