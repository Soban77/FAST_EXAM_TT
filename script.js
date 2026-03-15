// Use same origin by default; set window.EXAM_TT_API (e.g. your backend URL) when frontend and API are deployed separately
const API = typeof window !== 'undefined' && window.EXAM_TT_API ? window.EXAM_TT_API : window.location.origin;

const views = {
  login: document.getElementById('view-login'),
  register: document.getElementById('view-register'),
  dashboard: document.getElementById('view-dashboard'),
  admin: document.getElementById('view-admin'),
};

const nav = document.getElementById('nav');

function showView(name) {
  if(Object.keys(views))  Object.keys(views).forEach((v) => { if(views[v])  views[v].classList.remove('active')});
  if (views[name]) views[name].classList.add('active');
  // if (name === 'admin') showAdminUpload(!!getAdminToken());
  updateNav();
}

{/* <a href="#" data-view="admin">Admin</a> */}

function updateNav() {
  const user = getStoredUser();
  nav.innerHTML = '';
  if (user) {
    nav.innerHTML = `<button type="button" id="navDashboard">My schedule</button><button type="button" id="navLogout">Sign out</button>`;
    document.getElementById('navDashboard').onclick = () => showView('dashboard');
    document.getElementById('navLogout').onclick = logout;
  } else {
    nav.innerHTML = `<a href="#" data-view="login">Sign in</a><a href="#" data-view="register">Register</a>`;
    nav.querySelectorAll('[data-view]').forEach((a) => {
      a.onclick = (e) => { e.preventDefault(); showView(a.dataset.view); };
    });
  }
}

function getStoredUser() {
  try {
    const s = localStorage.getItem('exam_tt_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (user) localStorage.setItem('exam_tt_user', JSON.stringify(user));
  else localStorage.removeItem('exam_tt_user');
}

function logout() {
  setStoredUser(null);
  showView('login');
}

document.querySelectorAll('[data-view]').forEach((el) => {
  el.addEventListener('click', (e) => {
    if (el.tagName === 'A') e.preventDefault();
    showView(el.dataset.view);
  });
});

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const roll = document.getElementById('loginRoll').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const data = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ rollNumber: roll, password }),
    });
    setStoredUser({ name: data.name, rollNumber: data.rollNumber, exams: data.exams });
    showView('dashboard');
    renderDashboard(data);
  } catch (err) {
    showMessage('loginForm', err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

// Register – check roll
document.getElementById('registerRoll').addEventListener('blur', async () => {
  const roll = document.getElementById('registerRoll').value.trim();
  const hint = document.getElementById('registerRollHint');
  if (!roll) { hint.textContent = ''; hint.className = 'hint'; return; }
  try {
    const data = await fetch(API + '/api/check-roll/' + encodeURIComponent(roll)).then((r) => r.json());
    if (data.found) {
      hint.textContent = data.name ? `Found: ${data.name}` : 'Roll number found';
      hint.className = 'hint ok';
    } else {
      hint.textContent = 'Roll number not in schedule. Upload the PDF first.';
      hint.className = 'hint err';
    }
  } catch {
    hint.textContent = '';
    hint.className = 'hint';
  }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const roll = document.getElementById('registerRoll').value.trim();
  const name = document.getElementById('registerName').value.trim();
  const password = document.getElementById('registerPassword').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api('/api/register', {
      method: 'POST',
      body: JSON.stringify({ rollNumber: roll, name, password }),
    });
    showMessage('registerForm', 'Account created. You can sign in now.', 'success');
    e.target.reset();
    document.getElementById('registerRollHint').textContent = '';
    setTimeout(() => showView('login'), 1500);
  } catch (err) {
    showMessage('registerForm', err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

function showMessage(formId, text, type) {
  const form = document.getElementById(formId);
  let msg = form.querySelector('.message');
  if (!msg) {
    msg = document.createElement('div');
    msg.className = 'message';
    form.insertBefore(msg, form.firstElementChild);
  }
  msg.textContent = text;
  msg.className = 'message ' + type;
}

async function renderDashboard(data) {
  const user = data || getStoredUser();
  if (!user) return;

  try {
    const res = await fetch(API + '/api/title');
    const tdata = await res.json();
    document.querySelector('.schedule-card h3').textContent = tdata.title;
  } catch {
    document.querySelector('.schedule-card h3').textContent = 'Exam Schedule';
  }

  const name = user.name || '—';
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileRoll').textContent = user.rollNumber || '—';
  document.getElementById('profileInitial').textContent = name.charAt(0).toUpperCase() || '?';
  const exams = user.exams || [];
  const tbody = document.getElementById('scheduleBody');
  tbody.innerHTML = exams.length
    ? exams
        .map(
          (e) =>
            `<tr>
              <td class="code">${escapeHtml(e.code)}</td>
              <td>${escapeHtml(e.courseName)}</td>
              <td>${escapeHtml(e.day)}</td>
              <td data-time="${escapeHtml(e.time)}">${escapeHtml(e.time)}</td>
              <td>${escapeHtml(e.teacher)}</td>
              <td>${escapeHtml(e.seat)}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="6">No exams in schedule.</td></tr>';
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// function getAdminToken() {
//   return sessionStorage.getItem('exam_tt_admin_token');
// }
// function setAdminToken(token) {
//   if (token) sessionStorage.setItem('exam_tt_admin_token', token);
//   else sessionStorage.removeItem('exam_tt_admin_token');
// }

// function showAdminUpload(show) {
//   document.getElementById('adminLoginBlock').classList.toggle('hidden', show);
//   document.getElementById('adminUploadBlock').classList.toggle('hidden', !show);
// }

// document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const password = document.getElementById('adminPassword').value;
//   const msgEl = document.getElementById('adminLoginMessage');
//   msgEl.textContent = '';
//   try {
//     const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
//     setAdminToken(data.token);
//     showAdminUpload(true);
//     document.getElementById('adminPassword').value = '';
//   } catch (err) {
//     msgEl.textContent = err.message;
//     msgEl.className = 'message error';
//   }
// });

// document.getElementById('adminLogoutBtn').addEventListener('click', () => {
//   setAdminToken(null);
//   showAdminUpload(false);
// });

// document.getElementById('uploadForm').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const file = document.getElementById('pdfFile').files[0];
//   const resultEl = document.getElementById('uploadResult');
//   const token = getAdminToken();
//   if (!token) { resultEl.textContent = 'Session expired. Sign in as admin again.'; resultEl.className = 'upload-result error'; return; }
//   resultEl.textContent = 'Uploading…';
//   resultEl.className = 'upload-result';
//   try {
//     const form = new FormData();
//     form.append('pdf', file);
//     const res = await fetch(API + '/api/upload-schedule', {
//       method: 'POST',
//       body: form,
//       headers: { Authorization: 'Bearer ' + token },
//     });
//     const data = await res.json().catch(() => ({}));
//     if (res.status === 401) {
//       setAdminToken(null);
//       showAdminUpload(false);
//       resultEl.textContent = 'Session expired. Sign in as admin again.';
//       resultEl.className = 'upload-result error';
//       return;
//     }
//     if (!res.ok) throw new Error(data.error || res.statusText);
//     resultEl.textContent = `Imported ${data.imported} student(s). All students can now see their seating.`;
//     resultEl.className = 'upload-result success';
//     document.getElementById('uploadForm').reset();
//   } catch (err) {
//     resultEl.textContent = err.message;
//     resultEl.className = 'upload-result error';
//   }
// });

// On load
(function init() {
  updateNav();
  const user = getStoredUser();
  if (user && user.exams) {
    showView('dashboard');
    renderDashboard(user);
  } else {
    showView('login');
  }
})();
