const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, defaultVal = []) {
  ensureDir();
  if (!fs.existsSync(file)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return defaultVal;
  }
}

function writeJson(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const studentsStore = {
  getAll() {
    return readJson(STUDENTS_FILE, []);
  },
  getByRoll(rollNumber) {
    const list = this.getAll();
    return list.find((s) => s.rollNumber.toUpperCase() === String(rollNumber).toUpperCase()) || null;
  },
  saveAll(students) {
    writeJson(STUDENTS_FILE, students);
  },
  mergeFromPdf(parsedStudents) {
    const existing = this.getAll();
    const byRoll = new Map(existing.map((s) => [s.rollNumber.toUpperCase(), s]));
    for (const s of parsedStudents) {
      const key = s.rollNumber.toUpperCase();
      byRoll.set(key, { name: s.name, rollNumber: s.rollNumber, exams: s.exams || [] });
    }
    this.saveAll(Array.from(byRoll.values()));
  },
};

const usersStore = {
  getAll() {
    return readJson(USERS_FILE, []);
  },
  getByRoll(rollNumber) {
    const list = this.getAll();
    return list.find((u) => u.rollNumber.toUpperCase() === String(rollNumber).toUpperCase()) || null;
  },
  add(user) {
    const list = this.getAll();
    if (list.some((u) => u.rollNumber.toUpperCase() === user.rollNumber.toUpperCase())) return false;
    list.push(user);
    writeJson(USERS_FILE, list);
    return true;
  },
  saveAll(users) {
    writeJson(USERS_FILE, users);
  },
};

module.exports = { studentsStore, usersStore };
