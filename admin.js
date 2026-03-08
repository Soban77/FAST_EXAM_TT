const API = window.location.origin;

function getAdminToken() {
  return sessionStorage.getItem('exam_tt_admin_token');
}
function setAdminToken(token) {
  if (token) sessionStorage.setItem('exam_tt_admin_token', token);
  else sessionStorage.removeItem('exam_tt_admin_token');
}

function showAdminUpload(show) {
  document.getElementById('adminLoginBlock').classList.toggle('hidden', show);
  document.getElementById('adminUploadBlock').classList.toggle('hidden', !show);
  // document.getElementById('adminUploadBlock').classList.add('active');
}

async function api(path, options = {}) {
  
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('adminPassword').value;
  const msgEl = document.getElementById('adminLoginMessage');
  msgEl.textContent = '';
  try {
    const data = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    // const data = await fetch('https://fastexamtt-production.up.railway.app/api/admin/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ password: 'admin123' })
    // });

    setAdminToken(data.token);
    showAdminUpload(true);
    document.getElementById('adminPassword').value = '';
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.className = 'message error';
  }
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  setAdminToken(null);
  showAdminUpload(false);
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('pdfFile').files[0];
  const title = document.getElementById('scheduleTitle').value.trim();
  const resultEl = document.getElementById('uploadResult');
  const token = getAdminToken();
  if (!token) {
    resultEl.textContent = 'Session expired. Sign in again.';
    resultEl.className = 'upload-result error';
    return;
  }
  resultEl.textContent = 'Uploading…';
  try {
    const form = new FormData();
    form.append('pdf', file);
    form.append('title', title);
    const res = await fetch(API + '/api/upload-schedule', {
      method: 'POST',
      body: form,
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setAdminToken(null);
      showAdminUpload(false);
      resultEl.textContent = 'Session expired. Sign in again.';
      resultEl.className = 'upload-result error';
      return;
    }
    if (!res.ok) throw new Error(data.error || res.statusText);
    resultEl.textContent = `Imported ${data.imported} student(s). Title set to "${title}".`;
    resultEl.className = 'upload-result success';
    document.getElementById('uploadForm').reset();
  } catch (err) {
    resultEl.textContent = err.message;
    resultEl.className = 'upload-result error';
  }
});

