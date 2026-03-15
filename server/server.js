const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { parseExamPdf } = require('./pdfParser');
const { studentsStore, usersStore } = require('./dataStore');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const adminTokens = new Set();
let adminPasswordHash = null;
async function getAdminHash() {
  if (!adminPasswordHash) adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  return adminPasswordHash;
}

app.use(cors());
app.use(express.json());

const PDF_SIZE_LIMIT = 50 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PDF_SIZE_LIMIT },
});

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Admin login required' });
  }
  next();
}

app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body || {};
    console.log(password);
    if (!password) return res.status(400).json({ error: 'Password required' });
    const ok = await bcrypt.compare(password, await getAdminHash());
    console.log(ok);
    if (!ok) return res.status(401).json({ error: 'Invalid password' });
    const token = crypto.randomBytes(32).toString('hex');
    adminTokens.add(token);
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/upload-schedule', requireAdmin, (req, res, next) => {
  upload.single('pdf')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'PDF is too large. Max 50 MB.' });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
    const students = await parseExamPdf(req.file.buffer);
    studentsStore.mergeFromPdf(students);

    const title = req.body.title || 'Exam Schedule';
    // Save title to a file
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'data', 'title.json'), JSON.stringify({ title }));

    res.json({ success: true, imported: students.length, title });
  } catch (err) {
    // console.error(err);
    res.status(500).json({ error: err.message || 'Failed to parse PDF' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { rollNumber, name, password } = req.body || {};
    if (!rollNumber || !password) return res.status(400).json({ error: 'Roll number and password required' });
    const student = studentsStore.getByRoll(rollNumber);
    if (!student) return res.status(404).json({ error: 'Roll number not found in exam schedule. Upload the schedule PDF first.' });
    const hash = await bcrypt.hash(password, 10);
    const added = usersStore.add({
      rollNumber: student.rollNumber,
      name: name || student.name,
      passwordHash: hash,
    });
    if (!added) return res.status(409).json({ error: 'Account already exists for this roll number' });
    res.json({ success: true, name: name || student.name, rollNumber: student.rollNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { rollNumber, password } = req.body || {};
    if (!rollNumber || !password) return res.status(400).json({ error: 'Roll number and password required' });
    const user = usersStore.getByRoll(rollNumber);
    if (!user) return res.status(401).json({ error: 'Invalid roll number or password' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid roll number or password' });
    const student = studentsStore.getByRoll(rollNumber);
    res.json({
      success: true,
      name: user.name,
      rollNumber: user.rollNumber,
      exams: (student && student.exams) || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/schedule/:rollNumber', (req, res) => {
  const student = studentsStore.getByRoll(req.params.rollNumber);
  if (!student) return res.status(404).json({ error: 'Schedule not found for this roll number' });
  res.json({ name: student.name, rollNumber: student.rollNumber, exams: student.exams || [] });
});

app.get('/api/check-roll/:rollNumber', (req, res) => {
  const student = studentsStore.getByRoll(req.params.rollNumber);
  res.json({ found: !!student, name: student ? student.name : null });
});

app.get('/api/title', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const file = path.join(__dirname, 'data', 'title.json');
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } else {
    res.json({ title: 'Exam Schedule' });
  }
});


app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  express.static(path.join(__dirname, '..'))(req, res, next);
});

// app.use(express.static(path.join(__dirname, '..')));


app.listen(PORT, () => console.log(`Exam TT server running at http://localhost:${PORT}`));
