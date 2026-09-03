const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const money = n => `R ${Number(n).toFixed(2)}`;
let menu = [];
let activeCategory = 'All';

const toast = (msg) => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
};

async function loadMenu() {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return;
  try {
    const r = await fetch('/api/menu');
    if (!r.ok) throw new Error();
    menu = await r.json();
    renderFilters();
    renderMenu();
  } catch (e) {
    menuGrid.innerHTML = '<p class="loading">The menu could not be loaded. Please start the application server.</p>';
  }
}

function renderFilters() {
  const filtersEl = document.getElementById('filters');
  if (!filtersEl) return;
  const cats = ['All', ...new Set(menu.map(x => x.Category))];
  filtersEl.innerHTML = cats.map(c => `<button class="filter ${c === activeCategory ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
  document.querySelectorAll('.filter').forEach(b => b.onclick = () => { activeCategory = b.dataset.cat; renderFilters(); renderMenu(); });
}

function renderMenu() {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return;
  const rows = activeCategory === 'All' ? menu : menu.filter(x => x.Category === activeCategory);
  menuGrid.innerHTML = rows.map(x => `<article class="menu-card"><img src="${x.ImageURL}" alt="${x.Name}"><div class="menu-info"><div class="category">${x.Category}</div><div class="menu-top"><h3>${x.Name}</h3><span class="price">${money(x.Price)}</span></div><p>${x.Description}</p></div></article>`).join('');
}

function validateReservationRequest(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return 'Please complete the date and time.';
  }

  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'Please choose a valid reservation date.';
  }

  const day = date.getDay();
  const isOpenDay = day === 2 || day === 3 || day === 4 || day === 5 || day === 6 || day === 0;
  if (!isOpenDay) {
    return 'Reservations are available from Tuesday to Sunday only.';
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue);
  if (!match) {
    return 'Please choose a valid reservation time.';
  }

  const [hours, minutes] = match.slice(1).map(Number);
  const totalMinutes = (hours * 60) + minutes;
  const openingMinutes = 12 * 60;
  const closingMinutes = 22 * 60;

  if (totalMinutes < openingMinutes || totalMinutes > closingMinutes) {
    return 'Reservations are available between 12:00 and 22:00.';
  }

  return '';
}

async function submitForm(form, url, messageId) {
  const data = Object.fromEntries(new FormData(form));
  const msg = document.querySelector(messageId);

  if (url.includes('reservations')) {
    const error = validateReservationRequest(data.date, data.time);
    if (error) {
      if (msg) msg.textContent = error;
      return;
    }
  }

  if (msg) msg.textContent = 'Sending…';
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const out = await r.json();
    if (!r.ok) throw new Error(out.error || 'Request failed');
    if (msg) msg.textContent = out.message;
    form.reset();
    toast(out.message);
    if (url.includes('reservations')) loadDashboard();
  } catch (e) {
    if (msg) msg.textContent = e.message;
  }
}

const reservationForm = document.getElementById('reservationForm');
if (reservationForm) {
  const reservationDateInput = reservationForm.querySelector('input[name="date"]');
  const reservationTimeInput = reservationForm.querySelector('input[name="time"]');

  if (reservationDateInput) {
    reservationDateInput.min = '2024-01-02';
    reservationDateInput.max = '2100-12-31';
  }

  if (reservationTimeInput) {
    reservationTimeInput.min = '12:00';
    reservationTimeInput.max = '22:00';
    reservationTimeInput.step = 900;
  }

  reservationForm.addEventListener('submit', e => { e.preventDefault(); submitForm(e.currentTarget, '/api/reservations', '#reservationMessage'); });
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(text && text.includes('<!DOCTYPE html>') ? 'The server returned an HTML page instead of JSON. Please ensure the app server is running and try again.' : text || 'Unexpected server response.');
  }

  return response.json();
}

async function checkManagerSession() {
  try {
    const response = await fetch('/api/admin/session', { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Unauthorized');
    const data = await parseJsonResponse(response);
    const loginBox = document.getElementById('managerLogin');
    const dashboardSection = document.getElementById('dashboard');
    if (loginBox) loginBox.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
    if (data && data.user) {
      const heading = document.querySelector('#dashboard .section-heading h2');
      if (heading) heading.textContent = `Manager dashboard — ${data.user}`;
    }
    // Only load dashboard data after session is confirmed
    loadDashboard();
  } catch (error) {
    const loginBox = document.getElementById('managerLogin');
    const dashboardSection = document.getElementById('dashboard');
    if (loginBox) loginBox.style.display = 'block';
    if (dashboardSection) dashboardSection.style.display = 'none';
  }
}

async function loginManager(form) {
  const email = form.email.value.trim();
  const password = form.password.value.trim();
  const message = document.getElementById('managerMessage');

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username: email, password })
    });
    const result = await parseJsonResponse(response);
    if (!response.ok) throw new Error(result.error || 'Login failed');
    if (message) message.textContent = result.message;
    window.location.href = '/dashboard.html';
  } catch (error) {
    if (message) message.textContent = error.message;
  }
}

const managerLoginForm = document.getElementById('managerLoginForm');
if (managerLoginForm) {
  managerLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    loginManager(managerLoginForm);
  });
}

const logoutButton = document.getElementById('logoutManager');
if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/dashboard.html';
  });
}

if (window.location.pathname === '/dashboard.html') {
  checkManagerSession();
}
// Note: loadDashboard is called inside checkManagerSession after session is confirmed — not directly on load

const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) feedbackForm.addEventListener('submit', e => { e.preventDefault(); submitForm(e.currentTarget, '/api/feedback', '#feedbackMessage'); });

async function loadDashboard() {
  const statsEl = document.getElementById('stats');
  const rowsEl = document.getElementById('reservationRows');
  if (!statsEl || !rowsEl) return;
  try {
    const [s, r] = await Promise.all([fetch('/api/admin/summary', { credentials: 'same-origin' }), fetch('/api/admin/reservations', { credentials: 'same-origin' })]);
    if (!s.ok || !r.ok) throw new Error('Failed to load dashboard data.');
    const stats = await s.json(), rows = await r.json();
    const vals = [
      stats.reservations ?? '—',
      stats.feedback    ?? '—',
      stats.menu        ?? '—',
      stats.orders      ?? '—'
    ];
    statsEl.innerHTML = vals.map((v, i) => `<div class="stat"><span>${['Reservations', 'Feedback', 'Menu items', 'Orders'][i]}</span><strong>${v}</strong></div>`).join('');
    rowsEl.innerHTML = Array.isArray(rows) && rows.length
      ? rows.map(x => `<tr><td>${x.Name || 'Guest'}</td><td>${x.Date}</td><td>${x.Time}</td><td>${x.PartySize}</td><td>${x.status || 'Pending'}</td></tr>`).join('')
      : '<tr><td colspan="5">No reservations yet.</td></tr>';
  } catch (e) {
    statsEl.innerHTML = ['Reservations', 'Feedback', 'Menu items', 'Orders'].map(label => `<div class="stat"><span>${label}</span><strong>—</strong></div>`).join('');
    rowsEl.innerHTML = '<tr><td colspan="5">Dashboard unavailable.</td></tr>';
  }
}

const refreshBtn = document.getElementById('refreshDashboard');
if (refreshBtn) refreshBtn.addEventListener('click', loadDashboard);

const menuToggle = document.querySelector('.menu-toggle');
if (menuToggle) menuToggle.addEventListener('click', () => { const n = document.getElementById('mainNav'); if (!n) return; n.classList.toggle('open'); menuToggle.setAttribute('aria-expanded', n.classList.contains('open')); });

document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => { const mainNav = document.getElementById('mainNav'); if (mainNav) mainNav.classList.remove('open'); }));

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Initialize only the page-specific loaders
if (document.getElementById('menuGrid')) loadMenu();
// Dashboard data is loaded by checkManagerSession — not here directly
