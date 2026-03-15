# FAST-NUCES Exam Schedule Portal

Students can create an account with their **roll number** and view their exam schedule in a responsive UI. Schedule data is extracted from the official FAST-NUCES exam PDF.

## Features

- **Student registration** using roll number (must exist in the uploaded schedule PDF)
- **Login** with roll number and password
- **Dashboard** showing exam table: Code, Course Name, Day, Time, Teacher, Seat
- **PDF upload** (admin only): admin logs in with password, then uploads the exam schedule PDF; once uploaded, all registered students see their seating
- **Node.js backend** with PDF parsing (`pdf-parse`), Express API, and file-based storage

## Setup

1. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```
   Server runs at **http://localhost:3000**

3. Open **http://localhost:3000** in a browser.

## Usage

1. **Admin uploads the schedule PDF** (once): click **Admin**, sign in with the admin password (default: `admin123`; set `ADMIN_PASSWORD` env to change), then upload the FAST-NUCES exam schedule PDF. Only the admin can upload; after upload, all students can see their seating.
2. **Register**: students go to "Register", enter roll number (e.g. `25K-0529`), full name, and password. The roll number must exist in the uploaded PDF.
3. **Sign in**: use roll number and password to see the exam schedule (and seating) on the dashboard.

## Tech

- **Backend**: Node.js, Express, `pdf-parse`, `multer`, `bcryptjs`, JSON file storage in `server/data/`
- **Frontend**: vanilla HTML/CSS/JS, responsive layout

## Project structure

```
Exam_TT/
├── index.html       # App shell (login, register, dashboard, admin upload)
├── index.css        # Styles
├── script.js        # Frontend logic & API calls
├── server/
│   ├── server.js    # Express API, admin auth, static serve
│   ├── pdfParser.js # FAST-NUCES PDF extraction
│   ├── dataStore.js # students.json, users.json
│   ├── data/        # Created at runtime
│   └── package.json
└── README.md
```

Optional: set `ADMIN_PASSWORD` environment variable before starting the server to change the admin password (default is `admin123`).

url:
https://fastexamtt-production.up.railway.app/
