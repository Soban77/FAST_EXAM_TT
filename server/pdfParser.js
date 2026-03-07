/**
 * Parses FAST-NUCES exam schedule PDFs.
 * Extracts student name, roll number, and exam table (Code, Course Name, Day, Time, Teacher, Seat).
 */

const pdfParse = require('pdf-parse');

const ROLL_PATTERN = /\b(\d{2}K-\d{4})\b/;
const DAY_PATTERN = /(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2})/;
const TIME_PATTERN = /(\d{1,2}:\d{2}-\d{1,2}:\d{2})/;

/**
 * Extract text from PDF buffer.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function getPdfText(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Split full PDF text into blocks (one per student).
 * @param {string} text
 * @returns {string[]}
 */
function splitIntoStudentBlocks(text) {
  const combined = text.replace(/\r\n/g, '\n');
  const rollRegex = /\d{2}K-\d{4}/;
  const marker = 'FAST-NUCES';
  const blocks = [];
  let pos = 0;
  while (true) {
    const idx = combined.indexOf(marker, pos);
    if (idx === -1) break;
    const nextIdx = combined.indexOf(marker, idx + marker.length);
    const end = nextIdx === -1 ? combined.length : nextIdx;
    const block = combined.slice(idx, end).trim();
    if (rollRegex.test(block)) blocks.push(block);
    pos = nextIdx === -1 ? combined.length : nextIdx;
  }
  if (blocks.length === 0 && rollRegex.test(combined)) blocks.push(combined);
  return blocks;
}

/**
 * Parse one student block into { name, rollNumber, exams }.
 */
// function parseStudentBlock(block) {
//   const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
//   let name = '';
//   let rollNumber = '';
//   const exams = [];

//   let rollLineIndex = -1;
//   for (let i = 0; i < lines.length; i++) {
//     const rollMatch = lines[i].match(ROLL_PATTERN);
//     if (rollMatch) {
//       rollNumber = rollMatch[1];
//       rollLineIndex = i;
//       if (i > 0) {
//         const prev = lines[i - 1];
//         name = prev.replace(/\s*Photo\s*/i, '').trim();
//         if (!name || /^(Code|Course|Day|Time|Teacher|Seat)$/i.test(name)) name = prev;
//       }
//       break;
//     }
//   }

//   if (!rollNumber) return null;

//   for (let i = rollLineIndex + 1; i < lines.length; i++) {
//     const line = lines[i];
//     const dayMatch = line.match(DAY_PATTERN);
//     const timeMatch = line.match(TIME_PATTERN);
//     if (!dayMatch || !timeMatch) continue;

//     const day = dayMatch[1];
//     const time = timeMatch[1];
//     const beforeDay = line.substring(0, line.indexOf(day)).trim();
//     const afterTime = line.substring(line.indexOf(time) + time.length).trim();
//     const codeCourse = beforeDay.split(/\s{2,}|\t/).filter(Boolean);
//     const teacherSeat = afterTime.split(/\s{2,}|\t/).filter(Boolean);
//     const code = codeCourse[0] || '';
//     const courseName = codeCourse.slice(1).join(' ').trim() || code;
//     const teacher = teacherSeat[0] || '';
//     const seat = teacherSeat.slice(1).join(' ').trim() || '';

//     exams.push({ code, courseName, day, time, teacher, seat });
//   }

//   return { name, rollNumber, exams };
// }

function parseStudentBlock(block) {
  const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
  let name = '';
  let rollNumber = '';
  const exams = [];

  let rollLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const rollMatch = lines[i].match(ROLL_PATTERN);
    if (rollMatch) {
      rollNumber = rollMatch[1];
      rollLineIndex = i;
      if (i > 0) {
        name = lines[i - 1].replace(/\s*Photo\s*/i, '').trim();
      }
      break;
    }
  }

  if (!rollNumber) return null;

  for (let i = rollLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const dayMatch = line.match(DAY_PATTERN);
    const timeMatch = line.match(TIME_PATTERN);

    // If this line contains day+time, treat it as the middle of an exam block
    if (dayMatch && timeMatch) {
      const day = dayMatch[1];
      const time = timeMatch[1];

      const codeLine = lines[i - 2] || '';     // two lines before = code
      const courseLine = lines[i - 1] || '';   // one line before = course name
      const teacherLine = lines[i + 1] || '';  // one line after = teacher
      const seatLine = lines[i + 2] || '';     // two lines after = seat

      // Extract code from codeLine (before comma if present)
      let code = '';
      let section = '';
      if (codeLine.includes(',')) {
        const parts = codeLine.split(',');
        code = parts[0].trim();
        section = parts[1].trim();
      } else {
        code = codeLine.trim();
      }

      const courseName = courseLine.trim();
      const teacher = teacherLine.trim();
      const seat = seatLine.trim();

      exams.push({ code, courseName, day, time, teacher, seat, section });
    }
  }

  return { name, rollNumber, exams };
}

/**
 * Parse full PDF buffer and return array of students with exams.
 * @param {Buffer} buffer
 * @returns {Promise<Array<{ name: string, rollNumber: string, exams: Array }>>}
 */
async function parseExamPdf(buffer) {
  const text = await getPdfText(buffer);

  const blocks = splitIntoStudentBlocks(text);
  const students = [];
  const seen = new Set();

  for (const block of blocks) {
    const student = parseStudentBlock(block);
    if (student && student.exams.length >= 0 && !seen.has(student.rollNumber)) {
      seen.add(student.rollNumber);
      students.push(student);
    }
  }

  return students;
}

module.exports = { parseExamPdf, getPdfText };
